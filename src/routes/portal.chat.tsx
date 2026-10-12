import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/portal/chat/ChatPanel";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const Route = createFileRoute("/portal/chat")({
  head: () => ({
    meta: [
      { title: "Chat | Beema Health" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalChatPage,
});

function PortalChatPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PortalPageHeader
        title="Chat"
        subtitle="Message your doctor or our support team."
      />
      <ChatPanel />
    </div>
  );
}
