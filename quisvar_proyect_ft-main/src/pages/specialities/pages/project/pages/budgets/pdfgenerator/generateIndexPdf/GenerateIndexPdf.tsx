import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { Level, SubTask } from '@/types/types';
import { styles } from './styleGenerateIndexPdf';

interface generateIndexPdfProps {
  data: Level;
}
const textRenderLevel = (level: Level) => {
  const { fontBold, isProject, isArea, isInclude } = styles;
  const styleIndex = level.isProject
    ? isProject
    : level.isArea
    ? isArea
    : level.isInclude
    ? isInclude
    : {};
  const fontWeight = level.level === 1 ? fontBold : {};
  return (
    <Text style={{ ...styles.textIndex, ...styleIndex, ...fontWeight }}>
      {level.item} {level.name}
    </Text>
  );
};
const textRenderSubtask = (subtask: SubTask) => {
  const { isInclude } = styles;
  return (
    <View key={subtask.id}>
      <Text style={{ ...styles.textIndex, ...isInclude }}>
        {subtask.item} {subtask.name}
      </Text>
    </View>
  );
};
const recursionIndex = (level: Level) => {
  const existSubtask = level?.subTasks?.length;

  return (
    <View style={styles.dropdownLevel}>
      {existSubtask
        ? level.subTasks.map(subtask => textRenderSubtask(subtask))
        : level?.nextLevel?.map(subLevel => (
            <View key={subLevel.id}>
              {textRenderLevel(subLevel)}
              {recursionIndex(subLevel)}
            </View>
          ))}
    </View>
  );
};
export const GenerateIndexPdf = ({ data }: generateIndexPdfProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{data.projectName}</Text>
      <View>{recursionIndex(data)}</View>
    </Page>
  </Document>
);
