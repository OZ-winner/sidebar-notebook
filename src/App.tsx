 import { getCurrentWindow } from "@tauri-apps/api/window";
 import NotePanel from "./components/NotePanel";
 import SidebarTrigger from "./components/SidebarTrigger";
 
 export default function App() {
   const label = getCurrentWindow().label;
 
   if (label === "trigger") {
     return <SidebarTrigger />;
   }
 
   if (label === "panel") {
     return <NotePanel />;
   }
 
   return null;
 }
