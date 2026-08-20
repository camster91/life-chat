import { AuthenticatedShell } from "../authenticated-shell";
import { ChatWorkspace } from "./chat-workspace";

export default function ChatPage() {
  return <AuthenticatedShell current="chat"><ChatWorkspace /></AuthenticatedShell>;
}
