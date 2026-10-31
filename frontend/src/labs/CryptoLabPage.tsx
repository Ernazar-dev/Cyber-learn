import { Flex } from "antd";
import { PageHeader } from "@/components/common";
import { CipherRoom } from "./crypto/cipher-room";
import { LAB_LOCALE } from "./i18n";
import "./lab.css";

// Kriptografiya laboratoriyasi: RootY-team'dagi /labs/crypto sahifasi.
// Tanlangan shifr URL hash'ida turadi: /labs/crypto#vigenere
export default function CryptoLabPage() {
  return (
    <Flex vertical gap={24}>
      <PageHeader
        title="Kriptografiya"
        subtitle="2600 yillik sirlar: Sparta tayoqchasidan Enigma, RSA va AES'gacha. Har bir shifrni o'qing, animatsiyada ko'ring, asbobda shifrlab-ochib ko'ring va mashqlarni yeching."
        crumbs={[{ title: "Laboratoriya", href: "/labs" }, { title: "Kriptografiya" }]}
      />
      <div className="lab-root">
        <CipherRoom locale={LAB_LOCALE} />
      </div>
    </Flex>
  );
}
