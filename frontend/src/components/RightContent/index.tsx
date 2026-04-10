import { QuestionCircleOutlined } from '@ant-design/icons';
import { SelectLang as UmiSelectLang } from '@umijs/max';

export type SiderTheme = 'light' | 'dark';

export const SelectLang: React.FC = () => {
  return (
    <UmiSelectLang
      style={{
        padding: 6,
        border: '1px solid var(--nd-border-visible)',
        borderRadius: 999,
        fontFamily: '"Space Mono", "JetBrains Mono", monospace',
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    />
  );
};

export const Question: React.FC = () => {
  return (
    <a
      href="https://pro.ant.design/docs/getting-started"
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        border: '1px solid var(--nd-border-visible)',
        borderRadius: 999,
        fontSize: '16px',
        color: 'var(--nd-text-secondary)',
      }}
    >
      <QuestionCircleOutlined />
    </a>
  );
};
