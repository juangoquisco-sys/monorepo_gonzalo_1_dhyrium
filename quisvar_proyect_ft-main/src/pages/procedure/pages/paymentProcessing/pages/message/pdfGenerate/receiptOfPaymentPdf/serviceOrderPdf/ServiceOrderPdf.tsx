import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styleServiceOrderPdf';
import type { ServiceOrderData } from '@/types/types';
import { NumerosALetras } from '@/utils/numerosALetras';
import { formatAmountMoney } from '@/utils/tools';
import { formatDate } from '@/utils/formatDate';
// window.convertir = require(' numero-a-letras ');
interface ServiceOrderPdfProps {
  data: ServiceOrderData;
}

export const ServiceOrderPdf = ({ data }: ServiceOrderPdfProps) => {
  const currentData = formatDate(new Date(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>ORDEN DE SERVICIO</Text>
        </View>
        <View style={{ ...styles.table, width: '20%', marginLeft: 'auto' }}>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableCol, width: '50%' }}>
              <Text style={styles.headers}>N°</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '50%' }}>
              <Text style={styles.headers}>DIa/Mes/Año</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableCol, width: '50%' }}>
              <Text style={styles.headers}>{data.ordenNumber}</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '50%' }}>
              <Text style={styles.headers}>{currentData}</Text>
            </View>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.infoLeft}>
            <Text style={styles.text_info}>
              Señores: {data.firstName} {data.lastName}
            </Text>
            <Text style={styles.text_info}>Direccion: {data.address}</Text>
            <Text style={styles.text_info}>Doc. Ref: {data.title}</Text>
            <Text style={styles.text_info}>
              Facturar a Nombre de: {data.company.name}
            </Text>
          </View>
          <View style={styles.infoRight}>
            <Text style={styles.text_info}>RUC: {data.ruc}</Text>
            <Text style={styles.text_info}>RUC: {data.company.ruc}</Text>
          </View>
        </View>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>ITM</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>CTA. CONTABLE</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '25%' }}>
              <Text style={styles.headers}>DESCRIPCIÓN </Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>CANTIDAD</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>UND</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>VALOR TOTAL S/.</Text>
            </View>
          </View>
          <View style={{ ...styles.tableRow, height: 300 }}>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>1</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}></Text>
            </View>
            <View style={{ ...styles.tableCol, width: '25%' }}>
              <Text style={styles.headers}>{data.concept} </Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>1</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>SERVICIO</Text>
            </View>
            <View style={{ ...styles.tableCol, width: '15%' }}>
              <Text style={styles.headers}>
                {formatAmountMoney(+data.amount)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.text}>SON:{NumerosALetras(+data.amount)}</Text>
          <Text style={styles.text}>
            TOTAL S/ {formatAmountMoney(+data.amount)}
          </Text>
        </View>
        <View style={styles.signature}>
          <View style={styles.signatureUser}>
            <Text style={styles.signatureText}> INTERASADO</Text>
            <Text style={styles.textSmall}>
              {data.firstName} {data.lastName}
            </Text>
            <Text style={styles.textSmall}>{data.dni}</Text>
          </View>
          <View style={styles.signatureUser}>
            <Text style={styles.signatureText}> COORDINADOR DE AREA</Text>
            <Text style={styles.textSmall}>{data.administrator?.fullname}</Text>
            <Text style={styles.textSmall}>{data.administrator?.dni}</Text>
          </View>
          <View style={styles.signatureUser}>
            <Text style={styles.signatureText}> ADMINISTRADOR</Text>
            <Text style={styles.textSmall}>Sadhit Vargas Montesinos</Text>
            <Text style={styles.textSmall}>44622486</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
