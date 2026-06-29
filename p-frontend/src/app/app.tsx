import AppProvider from "./provider";
import Router from "./router";
import type { GameTable } from "../api/admin";
import SystemMessageModal from "../components/SystemMessageModal";

import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, Zoom } from "react-toastify";

interface AppProps {
  initialTables?: GameTable[];
}

function App({ initialTables }: AppProps) {
  return (
    <AppProvider initialTables={initialTables}>
      <Router />
      <SystemMessageModal />
      <ToastContainer position="bottom-right" autoClose={2000} hideProgressBar closeOnClick pauseOnHover={false} theme="dark" transition={Zoom} />
    </AppProvider>
  );
}

export default App;
