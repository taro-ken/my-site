import { useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';

type BlogHtmlContentProps = {
  html: string;
};

const baseStyle = {
  color: '#f4f4f5',
  fontSize: 16,
  lineHeight: 28,
};

const tagsStyles = {
  body: baseStyle,
  p: {
    marginBottom: 24,
  },
  h2: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900' as const,
    marginTop: 48,
    marginBottom: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BF953F',
  },
  h3: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900' as const,
    marginTop: 40,
    marginBottom: 16,
    paddingLeft: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#27272a',
  },
  a: {
    color: '#a1a1aa',
    textDecorationLine: 'underline' as const,
  },
  strong: {
    color: '#ffffff',
    fontWeight: '700' as const,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: '#52525b',
    paddingLeft: 24,
    color: '#d4d4d8',
    fontStyle: 'italic' as const,
  },
};

export default function BlogHtmlContent({ html }: BlogHtmlContentProps) {
  const { width } = useWindowDimensions();
  const safeHtml = typeof html === 'string' ? html : '';

  if (!safeHtml) {
    return null;
  }

  return (
    <RenderHTML
      contentWidth={width - 40}
      source={{ html: safeHtml }}
      tagsStyles={tagsStyles}
      baseStyle={baseStyle}
    />
  );
}
