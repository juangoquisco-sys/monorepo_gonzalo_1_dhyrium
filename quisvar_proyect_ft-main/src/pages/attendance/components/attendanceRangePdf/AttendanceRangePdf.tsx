import { Document, PDFViewer, Page, Text, View } from '@react-pdf/renderer';
import type { AttendanceRange, RangeDate } from '@/types/types';
import { styles } from './attendaceRangeStyle';
import { information } from '@/utils/constantsPdf';
import { getPrice } from '@/utils/excelGenerate/utils/excelTools';
import { countStatusAttendance } from '../../utils/countStatusAttendance';
interface AttendanceRangePdfProps {
  data: AttendanceRange[];
  rangeDate: RangeDate;
}

const generatePDF = (data: AttendanceRange[], rangeDate: RangeDate) => {
  return (
    <Document>
      <Page size={'A4'} orientation={'landscape'} style={styles.page}>
        <View style={{ ...styles.table, width: '52.8%' }}>
          <View style={{ ...styles.title }}>
            <Text style={styles.headers}>
              LISTA DE ASISTENCIA DEL {rangeDate?.startDate} AL{' '}
              {rangeDate.endDate}
            </Text>
          </View>
        </View>
        <View style={{ ...styles.table, width: '86%' }}>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableCol, width: '5%' }}>
              <Text style={styles.headers}>N°</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>CUARTOS</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '18%' }}>
              <Text style={styles.headers}>APELLIDOS Y NOMBRES</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '9%' }}>
              <Text style={styles.headers}>DNI</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '9%' }}>
              <Text style={styles.headers}>CELULAR</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '21%' }}>
              <Text style={styles.headers}>ASISTENCIAS</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '11.5%' }}>
              <Text style={styles.headers}>TOTAL</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '11.5%' }}>
              <Text style={styles.headers}>CONCILIACIÓN</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableCol, width: '56%' }}></View>

            <View
              style={{
                ...styles.tableCol,
                width: '3%',
                backgroundColor: '#87E4BD',
              }}
            >
              <Text style={styles.headers}>P</Text>
            </View>
            <View
              style={{
                ...styles.tableCol,
                width: '3%',
                backgroundColor: '#FFE17F',
              }}
            >
              <Text style={styles.headers}>T</Text>
            </View>
            <View
              style={{
                ...styles.tableCol,
                width: '3%',
                backgroundColor: '#F8C5C5',
              }}
            >
              <Text style={styles.headers}>F</Text>
            </View>
            <View
              style={{
                ...styles.tableCol,
                width: '3%',
                backgroundColor: '#F19191',
              }}
            >
              <Text style={styles.headers}>G</Text>
            </View>
            <View
              style={{
                ...styles.tableCol,
                width: '3%',
                backgroundColor: '#D2595B',
              }}
            >
              <Text style={styles.headers}>M</Text>
            </View>
            <View
              style={{
                ...styles.tableCol,
                width: '3%',
                backgroundColor: '#83A8F0',
              }}
            >
              <Text style={styles.headers}>L</Text>
            </View>
            <View
              style={{
                ...styles.tableCol,
                width: '3%',
                backgroundColor: '#877CDC',
              }}
            >
              <Text style={styles.headers}>S</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '11.5%' }}></View>
            <View style={{ ...styles.tableCol, width: '11.5%' }}></View>
          </View>
          {data &&
            data.map((value, index) => {
              const counts = countStatusAttendance(value);
              return (
                <View key={value.id} style={styles.tableRow}>
                  <View style={{ ...styles.tableCol, width: '5%' }}>
                    <Text style={styles.headers}>{index + 1}</Text>
                  </View>
                  <View style={{ ...styles.tableCol, width: '15%' }}>
                    <Text style={styles.headers}>
                      {value.profile.room ?? '---'}
                    </Text>
                  </View>
                  <View style={{ ...styles.tableCol, width: '18%' }}>
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
                  <View style={{ ...styles.tableCol, width: '9%' }}>
                    <Text style={styles.headers}>{value.profile.dni}</Text>
                  </View>
                  <View style={{ ...styles.tableCol, width: '9%' }}>
                    <Text style={styles.headers}>{value.profile.phone}</Text>
                  </View>

                  <View
                    style={{
                      ...styles.tableCol,
                      width: '3%',
                      backgroundColor: '#87E4BD',
                    }}
                  >
                    <Text style={styles.headers}>{counts.PUNTUAL}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '3%',
                      backgroundColor: '#FFE17F',
                    }}
                  >
                    <Text style={styles.headers}>{counts.TARDE}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '3%',
                      backgroundColor: '#F8C5C5',
                    }}
                  >
                    <Text style={styles.headers}>{counts.SIMPLE}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '3%',
                      backgroundColor: '#F19191',
                    }}
                  >
                    <Text style={styles.headers}>{counts.GRAVE}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '3%',
                      backgroundColor: '#D2595B',
                    }}
                  >
                    <Text style={styles.headers}>{counts.MUY_GRAVE}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '3%',
                      backgroundColor: '#83A8F0',
                    }}
                  >
                    <Text style={styles.headers}>{counts.PERMISO}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '3%',
                      backgroundColor: '#877CDC',
                    }}
                  >
                    <Text style={styles.headers}>{counts.SALIDA}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '11.5%',
                      ...styles.totalCurrency,
                    }}
                  >
                    <Text style={{ ...styles.headers, color: 'red' }}>S/.</Text>
                    <Text style={{ ...styles.headers, color: 'red' }}>
                      {getPrice(counts, value.role.hierarchy < 3).toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCol,
                      width: '11.5%',
                      ...styles.totalCurrency,
                    }}
                  >
                    <Text style={{ ...styles.headers, color: 'red' }}>S/.</Text>
                    <Text style={{ ...styles.headers, color: 'red' }}>
                      {value.conciliationAmount?.toFixed(2) ?? '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
        </View>
        <View style={{ ...styles.table, marginTop: 10, width: '60%' }}>
          {information &&
            information.map(info => (
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
                  <Text style={{ ...styles.headers, textAlign: 'left' }}>
                    {'   ' + info.descripcion}
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

export const AttendanceRangePdf = ({
  data,
  rangeDate,
}: AttendanceRangePdfProps) => {
  const filterUsers: AttendanceRange[] = data.filter(
    user => user.list.length !== 0
  );
  return (
    <PDFViewer width="100%" height="100%">
      {generatePDF(filterUsers, rangeDate)}
    </PDFViewer>
  );
};
