import React from "react";
import { Button, Modal } from "@pokt-foundation/ui";
import ConfirmActionContainer from "./container";

export default function ConnectionModal({
  visible,
  onClose,
  onConfirm,
  onCancel,
  connectionData,
}) {
  return (
    <Modal visible={visible} onClose={onClose} className="pocket-modal">
      <ConfirmActionContainer>
        <h1>Connection Request</h1>
        <p>You have a wallet connection request from</p>
        <br />
       <h1>{connectionData?.client || ''}</h1>
        <div className="buttons-container">
          <Button onClick={onCancel}>Deny</Button>
          <Button mode="primary" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </ConfirmActionContainer>
    </Modal>
  );
}