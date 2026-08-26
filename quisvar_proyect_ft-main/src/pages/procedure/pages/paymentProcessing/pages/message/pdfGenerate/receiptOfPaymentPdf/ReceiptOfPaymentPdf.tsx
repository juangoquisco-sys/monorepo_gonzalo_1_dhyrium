import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './stylesReceiptOfPaymentPdf';
import type { ServiceOrderData } from '@/types/types';
import { formatAmountMoney } from '@/utils/tools';
import { formatDate } from '@/utils/formatDate';
interface ReceiptOfPaymentPdfProps {
  data: ServiceOrderData;
}
const ReceiptOfPaymentPdf = ({ data }: ReceiptOfPaymentPdfProps) => {
  const date = formatDate(new Date(), { year: 'numeric' });
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ position: 'relative' }}>
          <View style={styles.title_enum}>
            <Text>
              {data.ordenNumber.toString().padStart(4, '0')} - {date}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#00B050', ...styles.title }}>
            RECIBO DE PAGO
          </Text>
        </View>
        <View style={{ gap: 15 }}>
          <Text style={styles.text}>
            {' '}
            HE RECIBIDO DE LA EMPRESA
            <Text style={styles.textBold}>
              {' '}
              {data.company.name.toUpperCase()}
            </Text>{' '}
            POR CONCEPTO DE :
          </Text>
          <Text style={styles.text}>
            {data.concept.toUpperCase()}, ADJUNTO AL PRESENTE.
          </Text>
          <Text style={styles.textName}>
            {data.firstName} {data.lastName}
          </Text>
        </View>
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>COMPROBANTE DE PAGO</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>N° CUENTA</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '55%' }}>
              <Text style={styles.headers}>DESCRPCION</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>N° DE CHEQUE </Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>TOTAL</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={{ ...styles.headers, paddingVertical: 20 }}>
                {data.payType === 'CUENTA' && data.acountNumber}
              </Text>
            </View>
            <View style={{ ...styles.tableCol, width: '55%' }}>
              <Text style={{ ...styles.headers, paddingVertical: 20 }}>
                {data.payType}
              </Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={{ ...styles.headers, paddingVertical: 20 }}>
                {data.payType === 'CHEQUE' && data.acountCheck}
              </Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={{ ...styles.headers, paddingVertical: 20 }}>
                S/. {formatAmountMoney(+data.amount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ justifyContent: 'space-between', height: '55%' }}>
          <View style={{ gap: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={{ ...styles.textBold, width: 60 }}>NOMBRE:</Text>
              <View style={{ borderBottomWidth: 1, width: 300 }} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ ...styles.textBold, width: 60 }}>D.N.I.:</Text>
              <View style={{ borderBottomWidth: 1, width: 180 }} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ ...styles.textBold, width: 60 }}>FECHA:</Text>
              <View style={{ borderBottomWidth: 1, width: 180 }} />
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'flex-end',
            }}
          >
            <View>
              <Text style={styles.signatureText}> RECIBI CONFORME</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ border: 1, width: 75, height: 80 }} />
              <Text
                style={{
                  ...styles.signatureText,
                  borderTopColor: 'white',
                }}
              >
                HUELLA DIGITAL
              </Text>
            </View>
          </View>
          <View style={styles.signature}>
            <View style={styles.signatureUser}>
              <Text style={styles.signatureText}>COORDINADOR DE AREA</Text>
              <Text style={styles.textSmall}>
                {data.administrator.fullname}
              </Text>
              <Text style={styles.textSmall}>{data.administrator.dni}</Text>
            </View>
            <View style={styles.signatureUser}>
              <Text style={styles.signatureText}>ADMINISTRADOR</Text>
              <Text style={styles.textSmall}>Sadhit Vargas Montesinos</Text>
              <Text style={styles.textSmall}>44622486</Text>
            </View>
            <View style={styles.signatureUser}>
              <Text style={styles.signatureText}>GERENTE GENERAL</Text>
              <Text style={styles.textSmall}>Juan Gonzalo Quispe Condori</Text>
              <Text style={styles.textSmall}>45574308</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptOfPaymentPdf;
