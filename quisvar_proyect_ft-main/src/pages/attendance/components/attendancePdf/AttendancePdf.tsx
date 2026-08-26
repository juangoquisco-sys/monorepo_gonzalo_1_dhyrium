import {
  Document,
  Page,
  Text,
  View,
  PDFViewer,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import { ATTENDANCE_STATUS_SHORT_LABELS } from '@/models/attendanceStatus';
import type { AttendanceRange } from '@/types/types';
import { information } from '@/utils/constantsPdf';
import { actualDate } from '@/utils/formatDate';
import './attendancePdf.css';
import { styles } from './styledComponents';
import { formatMonth } from '@/utils/dayjsSpanish';

export type TablesProps = {
  descripcion: string | null;
  encargados: string | null;
};

interface PDFGeneratorProps {
  data: AttendanceRange[];
  daily?: string;
  size?: 'A4' | 'A5';
  position?: number;
}

const orderCalls = [
  'primer llamado',
  'segundo llamado',
  'tercer llamado',
  'cuarto llamado',
  'quinto llamado',
  'sexto llamado',
  'sétimo llamado',
  'octavo llamado',
  'noveno llamado',
  'decimo llamado',
  'undecimo llamado',
  'duodecimo llamado',
  'decimotercero llamado',
  'decimocuarto llamado',
  'decimoquinto llamado',
  'decimosexto llamado',
  'decimosetimo llamado',
  'decimooctavo llamado',
  'decimonoveno llamado',
  'vigesimo llamado',
  'vigesimoprimero llamado',
  'vigesimosegundo llamado',
];

const GenerateAttendanceDailyPDF = ({
  data,
  daily,
  size,
  position,
}: PDFGeneratorProps) => {
  const totalAttendance = data.map(user => user.list.length);
  const maxAttendance = Math.max(...totalAttendance);
  const initialCalls =
    data[0].list.length <= 6
      ? orderCalls.slice(0, 6)
      : orderCalls.slice(0, maxAttendance);

  const getStatus = (data: AttendanceRange) => {
    const orderedStatus: string[] = [];
    initialCalls.forEach(call => {
      const estadoEncontrado = data.list.find(item => item.list.title === call);
      if (estadoEncontrado) {
        const inicialEstado =
          (ATTENDANCE_STATUS_SHORT_LABELS as Record<string, string>)[
            estadoEncontrado.status
          ] || ' ';
        orderedStatus.push(inicialEstado);
      } else {
        orderedStatus.push(' ');
      }
    });

    return orderedStatus;
  };

  const renderRows = (data: AttendanceRange[], startIndex: number) => {
    return data.slice(startIndex, startIndex + 41).map((value, index) => {
      const attendances = getStatus(value);
      const getColor = (status: string) => {
        if (status === 'P') return '#87E4BD';
        if (status === 'T') return '#FFE17F';
        if (status === 'F') return '#F8C5C5';
        if (status === 'G') return '#F19191';
        if (status === 'M') return '#D2595B';
        if (status === 'L') return '#83A8F0';
        if (status === 'S') return '#877cdc';
      };
      return (
        <View key={value.id} style={styles.tableRow}>
          <View style={{ ...styles.tableCol, width: '5%' }}>
            <Text style={styles.headers}>{index + 1 + startIndex}</Text>
          </View>
          <View style={{ ...styles.tableCol, width: '7%' }}>
            <Text style={styles.headers}>{value.profile.room ?? '---'}</Text>
          </View>
          <View style={{ ...styles.tableCol, width: '22%' }}>
            <Text
              style={{
                ...styles.headers,
                textAlign: 'left',
                marginHorizontal: 5,
              }}
            >
              {value.profile.lastName + ' ' + value.profile.firstName}
            </Text>
          </View>
          <View style={{ ...styles.tableCol, width: '10%' }}>
            <Text style={styles.headers}>{value.profile.dni}</Text>
          </View>
          <View style={{ ...styles.tableCol, width: '10%' }}>
            <Text style={styles.headers}>{value.profile.phone}</Text>
          </View>
          <View style={{ ...styles.attendance, width: '46%' }}>
            {attendances.map((attendance, index) => (
              <Text
                style={{
                  ...styles.attendanceItem,
                  backgroundColor: getColor(attendance),
                }}
                key={index}
              >
                {attendance}
              </Text>
            ))}
          </View>
        </View>
      );
    });
  };

  const renderHeader = () => (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View style={{ ...styles.tableCol, width: '5%' }}>
          <Text style={styles.headers}>N°</Text>
        </View>
        <View style={{ ...styles.tableCol, width: '7%' }}>
          <Text style={{ ...styles.headers, fontSize: '6px' }}>CUARTOS</Text>
        </View>
        <View style={{ ...styles.tableCol, width: '22%' }}>
          <Text style={styles.headers}>APELLIDOS Y NOMBRES</Text>
        </View>
        <View style={{ ...styles.tableCol, width: '10%' }}>
          <Text style={styles.headers}>DNI</Text>
        </View>
        <View style={{ ...styles.tableCol, width: '10%' }}>
          <Text style={styles.headers}>CELULAR</Text>
        </View>
        <View style={{ ...styles.tableCol, width: '46%' }}>
          <Text style={styles.headers}>ASISTENCIAS</Text>
        </View>
      </View>
      <View style={styles.tableRow}>
        <View style={{ ...styles.tableCol, width: '54%' }}>
          <Text style={styles.headers}></Text>
        </View>
        <View style={{ ...styles.attendance, width: '46%' }}>
          {initialCalls.map((_, index) => (
            <Text style={{ ...styles.attendanceItem }} key={index}>
              {index + 1}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );

  const renderRecursive: any = (
    data: AttendanceRange[],
    startIndex: number
  ) => {
    if (startIndex >= data.length) return null;

    return (
      <View style={styles.tableRender}>
        {renderHeader()}
        {renderRows(data, startIndex)}
        {data.length > startIndex + 41 && (
          <>{renderRecursive(data, startIndex + 41)}</>
        )}
      </View>
    );
  };

  return (
    <Document>
      <Page
        size={size ?? 'A4'}
        style={size === 'A4' ? styles.page : styles.pageA5}
      >
        <View
          style={{
            width: '100%',
            fontSize: '12px',
            textDecoration: 'underline',
            fontWeight: 'semibold',
            paddingBottom: '5px',
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
        >
          <Text>
            LISTA DE ASISTENCIA Nº {position?.toString().padStart(3, '0')} -{' '}
            {formatMonth(daily)} ({actualDate(daily)})
          </Text>
        </View>

        <View style={styles.father}>{renderRecursive(data, 0)}</View>
        {data.length >= 34 && data.length < 41 && (
          <View style={{ height: `${(41 - data.length) * 18}px` }}></View>
        )}
        <View
          style={{
            ...styles.table,
            marginTop: 10,
            width: '60%',
            borderTopWidth: 1,
            borderLeftWidth: 1,
          }}
        >
          <View style={styles.information}>
            <View style={{ ...styles.tableCol, width: '10%' }}>
              <Text style={styles.headers}>N°</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '12%' }}>
              <Text style={styles.headers}>SIMBOLO</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '28%' }}>
              <Text style={styles.headers}>DESCRIPCION</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>MULTA</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '35%' }}>
              <Text style={{ ...styles.headers, textAlign: 'center' }}>
                MULTA COORDINADORES Y GERENTE
              </Text>
            </View>
          </View>
          {information.map(info => (
            <View key={info.item} style={styles.information}>
              <View style={{ ...styles.tableCol, width: '10%' }}>
                <Text style={styles.headers}>{info.item}</Text>
              </View>
              <View
                style={{
                  ...styles.tableCol,
                  width: '12%',
                  backgroundColor: info.color,
                }}
              >
                <Text style={styles.headers}>{info.simbolo}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: '28%' }}>
                <Text
                  style={{ ...styles.headers, textAlign: 'left', width: '90%' }}
                >
                  {info.descripcion}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: '15%' }}>
                <Text style={styles.headers}>{info.multa}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: '35%' }}>
                <Text style={styles.headers}>{info.gerente}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export const AttendancePdf = ({ data, daily, position }: PDFGeneratorProps) => {
  const filteredUsers: AttendanceRange[] = data.filter(
    user => user?.list.length !== 0
  );
  return (
    <div className="attendancePdf-content">
      <PDFViewer className="attendancePdf-viewer">
        <GenerateAttendanceDailyPDF
          data={filteredUsers}
          daily={daily}
          size="A4"
          position={position}
        />
      </PDFViewer>
      <PDFDownloadLink
        document={
          <GenerateAttendanceDailyPDF
            data={filteredUsers}
            daily={daily}
            size="A4"
            position={position}
          />
        }
        fileName={`LISTA DE ASISTENCIA Nº ${position
          ?.toString()
          .padStart(3, '0')} - ${formatMonth(
          daily
        ).toUpperCase()} (${actualDate(daily)}).pdf`}
        className="attendance-download attendancePdf-hidden"
      >
        <p>Descargar pdf</p>
      </PDFDownloadLink>
    </div>
  );
};
