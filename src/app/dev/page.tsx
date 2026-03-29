import { redirect } from "next/navigation"
import { DevToolbar } from "./dev-toolbar"

export default function DevPage() {
  if (process.env.NODE_ENV !== "development") redirect("/")
  return <DevToolbar />
}