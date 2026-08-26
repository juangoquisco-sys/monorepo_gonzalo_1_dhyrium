import React from 'react';
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
} from '@react-pdf/renderer';
import { styles } from './styledComponents';
import type { PdfInfoProps } from '../../../../types/types.request';
import type {
  Duty,
  GroupAttendanceRes,
} from '../../../../types/types.response';
import { _date } from '@/utils/formatDate';
interface DutyPdfProps {
  attendance: GroupAttendanceRes[];
  duty: Duty[];
  info?: PdfInfoProps;
}

const DutyPdf: React.FC<DutyPdfProps> = ({ info, attendance, duty }) => {
  const renderInfo = () => {
    return (
      <View style={styles.table}>
        <View style={{ ...styles.tableRow }}>
          <View style={{ ...styles.tableCol, width: '100%' }}>
            <Text style={{ ...styles.headerBold }}>{info?.title}</Text>
          </View>
        </View>
        <View style={{ ...styles.tableRow }}>
          <View style={{ ...styles.tableCol, width: '100%' }}>
            <Text style={styles.headers}>{info?.group}</Text>
          </View>
        </View>
        <View style={{ ...styles.tableRow }}>
          <View style={{ ...styles.tableCol, width: '50%' }}>
            <Text style={{ ...styles.headers, ...styles.bold }}>Fecha: </Text>
          </View>
          <View style={{ ...styles.tableCol, width: '50%' }}>
            <Text style={styles.headers}>
              {_date(new Date(info?.createdAt as string))}
            </Text>
          </View>
        </View>
        <View style={{ ...styles.tableRow }}>
          <View style={{ ...styles.tableCol, width: '50%' }}>
            <Text style={{ ...styles.headers, ...styles.bold }}>
              Coordinador:
            </Text>
          </View>
          <View style={{ ...styles.tableCol, width: '50%' }}>
            <Text style={styles.headers}>{info?.mod}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAttendance = () => {
    return (
      <View style={styles.table}>
        <View style={{ ...styles.tableRow }}>
          <View style={{ ...styles.tableCol, width: '10%' }}>
            <Text style={{ ...styles.headers, ...styles.bold }}>Nº</Text>
          </View>
          <View style={{ ...styles.tableCol, width: '70%' }}>
            <Text style={{ ...styles.headers, marginLeft: 5, ...styles.bold }}>
              Nombres y Apellidos
            </Text>
          </View>
          <View style={{ ...styles.tableCol, width: '20%' }}>
            <Text style={{ ...styles.headers, ...styles.bold }}>
              Asistencia
            </Text>
          </View>
        </View>
        {attendance &&
          attendance.map((item, idx) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={{ ...styles.tableCol, width: '10%' }}>
                <Text style={styles.headers}>{idx + 1}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: '70%' }}>
                <Text style={{ ...styles.headers, marginLeft: 5 }}>
                  {item.user.profile.firstName +
                    ' ' +
                    item.user.profile.lastName}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: '20%' }}>
                <Text style={styles.headers}>{item.status}</Text>
              </View>
            </View>
          ))}
      </View>
    );
  };

  const renderDutyTable = () => {
    return (
      <View style={styles.table}>
        <View style={{ ...styles.tableRow }}>
          <View style={{ ...styles.tableCol, width: '5%' }}>
            <Text style={{ ...styles.headers, ...styles.bold }}>Nº</Text>
          </View>
          <View style={{ ...styles.tableCol, width: '25%' }}>
            <Text style={{ ...styles.headers, marginLeft: 5, ...styles.bold }}>
              Nombres y Apellidos
            </Text>
          </View>
          <View style={{ ...styles.tableCol, width: '60%' }}>
            <Text style={{ ...styles.headers, ...styles.bold }}>
              Compromisos
            </Text>
          </View>
          <View style={{ ...styles.tableCol, width: '10%' }}>
            <Text style={{ ...styles.headers, ...styles.bold }}>
              Fecha Limite
            </Text>
          </View>
        </View>
        {duty &&
          duty.map((item, idx) => (
            <View style={{ ...styles.tableRow }} key={item.id}>
              <View style={{ ...styles.tableCol, width: '5%' }}>
                <Text style={styles.headers}>{idx + 1}</Text>
              </View>
              <View style={{ ...styles.tableCol, width: '25%' }}>
                <Text style={{ ...styles.headers, marginLeft: 5 }}>
                  {/* {item.fullName} */}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: '60%' }}>
                <Text style={{ ...styles.headers, marginLeft: 5 }}>
                  {/* {item.description} */}
                </Text>
              </View>
              <View style={{ ...styles.tableCol, width: '10%' }}>
                <Text style={styles.headers}>
                  {/* {actualDate(new Date(item.untilDate as string))} */}
                </Text>
              </View>
            </View>
          ))}
      </View>
    );
  };
  const MyDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={{ ...styles.headerBold }}>ACTA DE REUNIÓN</Text>
        <View style={{ marginBottom: 20 }}>{renderInfo()}</View>
        <Text style={{ ...styles.headerBold, marginLeft: 5 }}>
          ASISTENCIAS:
        </Text>
        <View style={{ marginBottom: 20 }}>{renderAttendance()}</View>
        <Text style={{ ...styles.headerBold, marginLeft: 5 }}>
          COMPROMISOS:
        </Text>
        <View>{renderDutyTable()}</View>
      </Page>
    </Document>
  );

  return (
    <>
      <PDFDownloadLink
        document={MyDocument}
        fileName={`Acta de reunión ${info?.group} ${_date(
          new Date(info?.createdAt as string)
        )}.pdf`}
      >
        <img src={`/svg/download.svg`} />
      </PDFDownloadLink>
    </>
  );
};

export default DutyPdf;
