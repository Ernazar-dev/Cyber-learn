import { Card, Col, Flex, Row, Tag, Typography } from "antd";
import { ArrowRightOutlined, ExperimentOutlined } from "@ant-design/icons";
import { Link } from "wouter";
import { IconTile, PageHeader } from "@/components/common";
import { labs, type Lab } from "./labs";

const { Title, Paragraph, Text } = Typography;

function LabCard({ lab }: { lab: Lab }) {
  return (
    <Link href={`/labs/${lab.slug}`}>
      <Card
        hoverable
        style={{ height: "100%" }}
        styles={{ body: { display: "flex", flexDirection: "column", gap: 12, height: "100%" } }}
      >
        <IconTile icon={<ExperimentOutlined />} />
        <Title level={4} style={{ margin: 0 }}>{lab.title}</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>{lab.summary}</Paragraph>
        <Flex gap={6} wrap style={{ marginTop: "auto" }}>
          {lab.topics.map((t) => (
            <Tag key={t} bordered={false}>{t}</Tag>
          ))}
        </Flex>
        <Text strong style={{ color: "#2563eb" }}>
          Laboratoriyaga kirish <ArrowRightOutlined />
        </Text>
      </Card>
    </Link>
  );
}

export default function LabsPage() {
  return (
    <Flex vertical gap={24}>
      <PageHeader
        title="Laboratoriya"
        subtitle="O'qib emas, qilib o'rganing. Har bir laboratoriya — tarix, interaktiv asbob va o'zingizni tekshiradigan mashqlar. Hammasi brauzerda, hech narsa o'rnatish shart emas."
      />
      <Row gutter={[16, 16]}>
        {labs.map((lab) => (
          <Col key={lab.slug} xs={24} md={12} xl={8}>
            <LabCard lab={lab} />
          </Col>
        ))}
      </Row>
    </Flex>
  );
}
