import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { SessionsPage } from "@/features/sessions/SessionsPage";
import { Layout } from "./Layout";
import { useLocation } from "./route";

export function App() {
  const { pathname } = useLocation();
  return <Layout>{pathname === "/sessions" ? <SessionsPage /> : <ProjectsPage />}</Layout>;
}
