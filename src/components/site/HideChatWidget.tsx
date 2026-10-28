/**
 * Hides the sitewide chat launcher and its greeting bubble while a full-screen
 * dialog is open. On a phone they sit on top of the dialog's bottom buttons
 * (Continue, Get started). Rendered inside dialog content, so the rule exists
 * only while the dialog is open; the chat window itself
 * (#chatbase-bubble-window) is left alone.
 */
export function HideChatWidget() {
  return (
    <style>{`#chatbase-bubble-button,#chatbase-message-bubbles{display:none!important}`}</style>
  );
}
