import { useState, useEffect, useMemo } from "react";
import { vscode } from "../utilities/vscode";
import Preview from "../components/Preview";
import { VSCodeButton, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import UrlBar from "../components/UrlBar";
import LogPanel from "../components/LogPanel";
import LogCounter from "../components/LogCounter";
import { useGlobalStateContext } from "../components/GlobalStateContext";
import "./View.css";
import "./PreviewView.css";

function setCssPropertiesForDevice(device) {
  // top right bottom left
  const m = device.backgroundMargins;
  const size = device.backgroundSize;
  document.documentElement.style.setProperty(
    "--phone-content-margins",
    `${((m[0] + m[2]) / size[0]) * 100}% 0% 0% ${(m[1] / size[1]) * 100}%`
  );

  document.documentElement.style.setProperty(
    "--phone-content-height",
    `${((size[0] - m[0] - m[2]) / size[0]) * 100}%`
  );
  document.documentElement.style.setProperty(
    "--phone-content-width",
    `${((size[1] - m[1] - m[3]) / size[1]) * 100}%`
  );
  document.documentElement.style.setProperty(
    "--phone-content-border-radius",
    device.backgroundBorderRadius
  );

  document.documentElement.style.setProperty(
    "--phone-content-aspect-ratio",
    `${device.width} / ${device.height}`
  );
}

const INITIAL_DEVICE_SETTINGS = {
  appearance: "dark",
  contentSize: "normal",
};

function PreviewView({ initialDevice }) {
  const [deviceId, setDeviceId] = useState(initialDevice.id);
  const [deviceSettings, setDeviceSettings] = useState(INITIAL_DEVICE_SETTINGS);
  const [previewURL, setPreviewURL] = useState();
  const [isInspecing, setIsInspecting] = useState(false);
  const [debugPaused, setDebugPaused] = useState(false);
  const [debugException, setDebugException] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logCounter, setLogCounter] = useState(0);
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [appURL, setAppURL] = useState("/");
  const { state: globalState } = useGlobalStateContext();

  const device = useMemo(
    () => globalState.devices.find((device) => deviceId === device.id),
    [deviceId, globalState]
  );

  useEffect(() => {
    setCssPropertiesForDevice(device);
  }, [device]);

  useEffect(() => {
    const listener = (event) => {
      const message = event.data;
      switch (message.command) {
        case "appReady":
          setPreviewURL(message.previewURL);
          break;
        case "inspectData":
          setInspectData(message.data);
          break;
        case "debuggerPaused":
          setDebugPaused(true);
          break;
        case "debuggerContinued":
          setDebugPaused(false);
          setDebugException(null);
          break;
        case "uncaughtException":
          setDebugException(message.isFatal ? "fatal" : "exception");
          break;
        case "logEvent":
          setLogCounter((logCounter) => logCounter + 1);
          break;
        case "consoleLog":
          setLogs((logs) => [{ type: "log", text: message.text }, ...logs]);
          break;
        case "consoleStack":
          setLogs((logs) => [
            {
              type: "stack",
              text: message.text,
              stack: message.stack,
              isFatal: message.isFatal,
            },
            ...logs,
          ]);
          break;
        case "appUrlChanged":
          setAppURL(message.url);
          break;
      }
    };
    window.addEventListener("message", listener);

    vscode.postMessage({
      command: "startProject",
      settings: INITIAL_DEVICE_SETTINGS,
      deviceId: initialDevice.id,
      systemImagePath: initialDevice.systemImage,
    });

    return () => window.removeEventListener("message", listener);
  }, []);

  return (
    <div className="panel-view">
      <div className="button-group-top">
        <VSCodeButton
          appearance={isFollowing ? "primary" : "secondary"}
          title="Follow active editor on the device"
          onClick={() => {
            vscode.postMessage({
              command: isFollowing ? "stopFollowing" : "startFollowing",
            });
            setIsFollowing(!isFollowing);
          }}>
          <span className="codicon codicon-magnet" />
        </VSCodeButton>

        <span className="group-separator" />

        <UrlBar url={appURL} />

        <div className="spacer" />

        <VSCodeButton
          appearance={"secondary"}
          onClick={() => {
            setLogCounter(0);
            vscode.postMessage({ command: "openLogs" });
          }}>
          <span slot="start" className="codicon codicon-debug-console" />
          Logs
          <LogCounter count={logCounter} />
        </VSCodeButton>
      </div>
      <Preview
        isInspecting={isInspecing}
        previewURL={previewURL}
        device={device}
        debugPaused={debugPaused}
        debugException={debugException}
        inspectData={inspectData}
        setIsInspecting={setIsInspecting}
        setInspectData={setInspectData}
      />

      <div className="button-group-bottom">
        <VSCodeButton
          appearance={isInspecing ? "primary" : "secondary"}
          onClick={() => {
            if (isInspecing) {
              setInspectData(null);
            }
            setIsInspecting(!isInspecing);
          }}>
          <span className="codicon codicon-inspect" />
        </VSCodeButton>

        <span className="group-separator" />

        <VSCodeDropdown
          onChange={(e) => {
            if (device.id !== e.target.value) {
              const newDevice = globalState?.devices.find((d) => d.id === e.target.value);
              setDeviceId(newDevice.id);
              setPreviewURL(undefined);
              vscode.postMessage({
                command: "changeDevice",
                settings: deviceSettings,
                deviceId: newDevice.id,
                systemImagePath: newDevice?.systemImage?.path,
              });
            }
          }}>
          <span slot="start" className="codicon codicon-device-mobile" />
          {globalState?.devices.map((device) => (
            <VSCodeOption key={device.id} value={device.id}>
              {device.name}
            </VSCodeOption>
          ))}
        </VSCodeDropdown>

        <VSCodeButton
          appearance="secondary"
          onClick={() => {
            setPreviewURL(undefined);
            vscode.postMessage({
              command: "restartProject",
              settings: deviceSettings,
              deviceId: device.id,
              systemImagePath: device.systemImage?.path,
            });
          }}>
          <span className="codicon codicon-refresh" />
        </VSCodeButton>

        <div className="spacer" />

        <VSCodeDropdown
          value={deviceSettings.appearance}
          onChange={(e) => {
            const newSettings = { ...deviceSettings, appearance: e.target.value };
            setDeviceSettings(newSettings);
            vscode.postMessage({
              command: "changeDeviceSettings",
              settings: newSettings,
              deviceId: e.target.value,
            });
          }}>
          <span slot="start" className="codicon codicon-color-mode" />
          <VSCodeOption value={"light"}>Light</VSCodeOption>
          <VSCodeOption value={"dark"}>Dark</VSCodeOption>
        </VSCodeDropdown>

        <VSCodeDropdown
          value={deviceSettings.contentSize}
          onChange={(e) => {
            const newSettings = { ...deviceSettings, contentSize: e.target.value };
            setDeviceSettings(newSettings);
            vscode.postMessage({
              command: "changeDeviceSettings",
              settings: newSettings,
              deviceId: e.target.value,
            });
          }}>
          <span slot="start" className="codicon codicon-text-size" />
          <VSCodeOption value="xsmall">Extra small</VSCodeOption>
          <VSCodeOption value="small">Small</VSCodeOption>
          <VSCodeOption value="normal">Normal</VSCodeOption>
          <VSCodeOption value="large">Large</VSCodeOption>
          <VSCodeOption value="xlarge">Extra large</VSCodeOption>
          <VSCodeOption value="xxlarge">XX large</VSCodeOption>
          <VSCodeOption value="xxxlarge">XXX large</VSCodeOption>
        </VSCodeDropdown>
      </div>
      <LogPanel expandedLogs={expandedLogs} logs={logs} />
    </div>
  );
}

export default PreviewView;