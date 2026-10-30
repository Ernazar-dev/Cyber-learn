import { createRoot } from "react-dom/client";
import { App as AntApp, ConfigProvider } from "antd";
import uzUZ from "antd/locale/uz_UZ";
import dayjs from "dayjs";
import "dayjs/locale/uz-latn";
import App from "./App";
import { theme } from "./theme/theme";
import "./index.css";

dayjs.locale("uz-latn");

createRoot(document.getElementById("root")!).render(
  <ConfigProvider theme={theme} locale={uzUZ}>
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>,
);
