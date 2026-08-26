import {
  Document,
  Page,
  Text,
  View,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import { styles } from './styledComponents';
import type { PdfDataProps } from '@/types/types';
import './GeneratePdf.css';

export type TablesProps = {
  descripcion: string | null;
  encargados: string | null;
};

interface PDFGeneratorProps {
  data: PdfDataProps;
  isView?: boolean;
  handleFocus?: () => void;
}
interface ConfigProps {
  size: 'A4' | 'A5';
}

export const generateReportPDF = (
  value: PDFGeneratorProps,
  config?: ConfigProps
) => (
  <Document>
    <Page
      size={config?.size ?? 'A4'}
      style={config?.size === 'A4' ? styles.page : styles.pageA5}
    >
      <Text style={{ ...styles.title }}>{value.data?.title}</Text>
      <View style={styles.headerContent}>
        {/* header */}
        <View style={styles.headerRow}>
          <View style={styles.leftInfo}>
            <Text style={styles.headerBold}>Para</Text>
            <Text style={styles.headerBold}>: </Text>
          </View>
          <View style={styles.rigthInfo}>
            <Text style={styles.header}>
              {value.data.toDegree?.slice(0, 3)}. {value.data?.to}
            </Text>
            <Text style={styles.header}>{value.data.toPosition}</Text>
          </View>
        </View>
        {/* header */}
        {value.data.cc &&
          value.data.cc?.length > 0 &&
          value.data.cc?.map((item, idx) => (
            <View style={styles.headerRow} key={idx}>
              <View style={styles.leftInfo}>
                <Text style={styles.headerBold}>{idx === 0 && 'CC'}</Text>
                <Text style={styles.headerBold}>: </Text>
              </View>
              <View>
                <Text style={styles.header}>
                  {item.degree?.slice(0, 3) === 'Tit'
                    ? 'ING'
                    : item.degree?.slice(0, 3)}
                  . {item.name}
                </Text>
                <Text style={styles.header}>{item.position}</Text>
              </View>
            </View>
          ))}
        {/* header */}
        <View style={styles.headerRow}>
          <View style={styles.leftInfo}>
            <Text style={styles.headerBold}>De</Text>
            <Text style={styles.headerBold}>: </Text>
          </View>
          <View>
            <Text style={{ ...styles.header, textTransform: 'uppercase' }}>
              {value.data.fromDegree?.slice(0, 3) === 'Tit'
                ? 'ING'
                : value.data.fromDegree?.slice(0, 3)}
              . {value.data?.from}
            </Text>
            <Text style={styles.header}>{value.data.fromPosition}</Text>
          </View>
        </View>
        {/* header */}
        <View style={styles.headerRow}>
          <View style={styles.leftInfo}>
            <Text style={styles.headerBold}>Asunto</Text>
            <Text style={styles.headerBold}>: </Text>
          </View>
          <View style={styles.rigthInfo}>
            <Text style={styles.headerLong}>{value.data?.header}</Text>
            {/* <Text style={styles.header}>GERENTE GENERAL</Text> */}
          </View>
        </View>
        {/* header */}
        <View style={styles.headerRow}>
          <View style={styles.leftInfo}>
            <Text style={styles.headerBold}>Fecha</Text>
            <Text style={styles.headerBold}>: </Text>
          </View>
          <View>
            <Text style={styles.header}>{value.data?.date}</Text>
          </View>
        </View>
      </View>
      <View style={styles.line} />
      {/* body */}
      {value.data.body &&
        value.data.body.length > 0 &&
        value.data.body.map((element, elementIndex) => (
          <View key={elementIndex}>
            {element.type === 'paragraph' ? (
              <Text style={styles.body}>{element.content}</Text>
            ) : element.type === 'table' ? (
              <View style={styles.table}>
                {element.data.map((row, rowIndex) => (
                  <View style={styles.tableRow} key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <View style={styles.tableCell} key={cellIndex}>
                        {rowIndex === 0 ? (
                          <Text style={styles.header}>{cell}</Text>
                        ) : (
                          <Text>{cell}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : element.type === 'orderedList' ? (
              <View style={styles.listContainer}>
                {element.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.rowList}>
                    <Text style={styles.listItem}>{itemIndex + 1}.</Text>
                    <Text style={styles.listItem}>{item.content}</Text>
                  </View>
                ))}
              </View>
            ) : element.type === 'unorderedList' ? (
              <View style={styles.listContainer}>
                {element.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.rowList}>
                    <Text style={styles.listItem}>•</Text>
                    <Text style={styles.listItem}>{item.content}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      {/* firma */}
      <View style={styles.signArea}>
        <View style={styles.sign} />
        <Text style={styles.header}>
          {value.data.fromDegree && value.data.fromDegree?.slice(0, 3) === 'Tit'
            ? 'ING'
            : value.data.fromDegree?.slice(0, 3)}
          . {value.data.from}
        </Text>
        <Text style={styles.header}>DNI: {value.data.dni}</Text>
      </View>
    </Page>
  </Document>
);

export const PDFGenerator = ({ data, handleFocus }: PDFGeneratorProps) => {
  return (
    <div className="pdf-btn-area-view" onMouseOver={handleFocus}>
      <PDFDownloadLink
        document={generateReportPDF({ data }, { size: 'A5' })}
        fileName={`${data.title}.pdf`}
        className="pdf-btn-view-white"
      >
        {({ loading }) => (
          <>
            <img
              className="chip-file-icon-doc normal"
              src={`/svg/file-download.svg`}
            />
            <img
              className="chip-file-icon-doc hover"
              src={`/svg/file-download-white.svg`}
            />

            <span className="download-text">{loading ? 'A5' : 'A5'}</span>
          </>
        )}
      </PDFDownloadLink>
      <PDFDownloadLink
        document={generateReportPDF({ data }, { size: 'A4' })}
        fileName={`${data.title}.pdf`}
        className="pdf-btn-view-white"
      >
        {({ loading }) => (
          <>
            <>
              <img
                className="chip-file-icon-doc normal"
                src={`/svg/file-download.svg`}
              />
              <img
                className="chip-file-icon-doc hover"
                src={`/svg/file-download-white.svg`}
              />
            </>
            <span className="download-text">{loading ? 'A4' : 'A4'}</span>
          </>
        )}
      </PDFDownloadLink>
    </div>
  );
};
