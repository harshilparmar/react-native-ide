import React from "react";
import * as Dialog from "@radix-ui/react-dialog";

import "./Modal.css";
import IconButton from "./IconButton";

interface ModalProps {
  title: string;
  component: React.ReactNode;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Modal({ title, component, open, setOpen }: ModalProps) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <Dialog.Title className="modal-title">{title}</Dialog.Title>

          <div className="modal-content-container">{component}</div>
          <Dialog.Close asChild>
            <IconButton
              className="modal-close-button"
              aria-label="Close"
              onClick={() => setOpen(false)}>
              <span className="codicon codicon-close" />
            </IconButton>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
