import { useLocation } from "wouter";
import { Button, Result } from "antd";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <Result
      status="404"
      title="Sahifa topilmadi"
      subTitle="Siz qidirgan sahifa mavjud emas yoki ko'chirilgan."
      extra={<Button type="primary" onClick={() => setLocation("/")}>Bosh sahifaga qaytish</Button>}
    />
  );
}
