export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Conferma", cancelText = "Annulla" }) {
  if (!isOpen) return null;

  return (
    <div className="recipe-modal-overlay">
      <div className="confirm-modal">
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="action-bar mt-3">
          <button className="btn btn--save" onClick={onConfirm}>✓ {confirmText}</button>
          <button className="btn btn--cancel" onClick={onCancel}>✕ {cancelText}</button>
        </div>
      </div>
    </div>
  );
}
