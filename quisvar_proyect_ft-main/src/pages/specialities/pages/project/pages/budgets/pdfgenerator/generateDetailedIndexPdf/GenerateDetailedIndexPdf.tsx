import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { Level, SubTask } from '@/types/types';
import { styles } from './styleGenerateDetailedIndexPdf';
import { getParticipantSummary } from '../../../../utils/normalizeProjectLevel';

interface GenerateDetailedIndexPdfProps {
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
    <View style={{ ...styles.levelContainer, borderBottomWidth: 0.6 }}>
      <Text
        style={{
          ...styles.textIndex,
          ...styleIndex,
          ...fontWeight,
          fontSize: level.projectName ? 10 : 8,
        }}
      >
        {level.item} {level.name}
      </Text>
      <View style={styles.infoContainer}>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>{level.days}</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>{level.percentage?.toFixed(2)}%</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>S/.{level.balance?.toFixed(2)}</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>-S/.{level.spending?.toFixed(2)}</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>S/.{level.price?.toFixed(2)}</Text>
        </View>

        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>{level.total}</Text>
        </View>

        <View
          style={{
            width: 140,
            alignItems: 'flex-end',
          }}
        >
          {getParticipantSummary(level).map(user => (
            <Text style={styles.infoText} key={user.dni}>
              {user.firstName} {user.lastName} X{user.count}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};
const textRenderSubtask = (subtask: SubTask) => {
  const { isInclude } = styles;
  return (
    <View key={subtask.id} style={styles.levelContainer}>
      <Text style={{ ...styles.textIndex, ...isInclude }}>
        {subtask.item} {subtask.name}
      </Text>
      <View style={styles.infoContainer}>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>S/.{(+subtask.price)?.toFixed(2)}</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>{subtask.percentage?.toFixed(2)}%</Text>
        </View>

        <View style={{ ...styles.infoTextContainer, width: 85 }}>
          <Text style={styles.infoText}>{subtask.days}</Text>
        </View>
        <View
          style={{
            width: 140,
            alignItems: 'flex-end',
          }}
        >
          {subtask?.users?.ACTIVE?.map(({ user }) => (
            <Text style={styles.infoText} key={user.id}>
              {user.profile.firstName} {user.profile.lastName}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};
const recursionIndex = (level: Level) => {
  const existSubtask = level?.subTasks?.length;

  return (
    <View style={styles.dropdownLevel}>
      {existSubtask
        ? level?.subTasks.map(subtask => textRenderSubtask(subtask))
        : level?.nextLevel?.map(subLevel => (
            <View key={subLevel.id}>
              {textRenderLevel(subLevel)}
              {recursionIndex(subLevel)}
            </View>
          ))}
    </View>
  );
};
export const GenerateDetailedIndexPdf = ({
  data,
}: GenerateDetailedIndexPdfProps) => {
  const tranformData = { nextLevel: [data] } as Level;
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation={'landscape'}>
        <Text style={styles.title}>{data.projectName}</Text>

        <View style={{ gap: 3 }}>
          <View
            style={{
              ...styles.infoContainer,
              marginLeft: 'auto',
            }}
          >
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoDetailText}>Dias</Text>
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoDetailText}>Porcentaje</Text>
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoDetailText}>Saldo</Text>
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoDetailText}>Gasto</Text>
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoDetailText}>Total</Text>
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoDetailText}>Tareas</Text>
            </View>
            <View
              style={{
                width: 140,
                alignItems: 'flex-end',
              }}
            >
              <Text style={styles.infoDetailText}>Participantes</Text>
            </View>
          </View>
          <View>{recursionIndex(tranformData)}</View>
        </View>
      </Page>
    </Document>
  );
};
