import { Document, Page, Image, Text, View } from '@react-pdf/renderer';
import { styles } from './styleCustomizableInvoicePdf';
import type { InvoiceXML } from '@/types/typeFactura';
import { formatDateToDMY } from '@/utils/formatDate';

interface CustomizableInvoicePdfProps {
  templateImg: string;
  dataXml: InvoiceXML;
}

export const CustomizableInvoicePdf = ({
  templateImg,
  dataXml,
}: CustomizableInvoicePdfProps) => {
  return (
    <Document>
      <Page size="A4">
        <View
          style={{
            position: 'absolute',
            top: '11.6%',
            left: '78.5%',
            width: '100%',
            gap: 5,
          }}
        >
          <Text style={styles.text}>
            {
              dataXml['cac:AccountingSupplierParty']['cac:Party'][
                'cac:PartyIdentification'
              ]['cbc:ID']['_']
            }
          </Text>
          <Text style={styles.text}>{dataXml['cbc:ID']}</Text>
          <Text style={styles.text}>76137511123</Text>
        </View>
        <View
          style={{
            position: 'absolute',
            top: '20.77%',
            left: '17%',
            width: '53%',
            gap: 1.95,
          }}
        >
          <Text style={styles.textInfo}>
            {
              dataXml?.['cac:AccountingCustomerParty']?.['cac:Party']?.[
                'cac:PartyIdentification'
              ]?.['cbc:ID']?.['_']
            }
          </Text>
          <Text style={styles.textInfo}>
            {
              dataXml?.['cac:AccountingCustomerParty']?.['cac:Party']?.[
                'cac:PartyLegalEntity'
              ]?.['cbc:RegistrationName']
            }
          </Text>
          <Text style={{ ...styles.textInfo, height: 32 }}>
            {
              dataXml?.['cac:BuyerCustomerParty']?.['cac:Party']?.[
                'cac:PartyLegalEntity'
              ]?.['cac:RegistrationAddress']?.['cac:AddressLine']?.['cbc:Line']
            }
          </Text>
          <Text style={styles.textInfo}>76137511123</Text>
        </View>
        <View
          style={{
            position: 'absolute',
            top: '20.75%',
            left: '84.5%',
            width: '53%',
            gap: 2.4,
          }}
        >
          <Text style={styles.textInfo}>
            {' '}
            {formatDateToDMY(dataXml['cbc:IssueDate'])}
          </Text>
          <Text style={styles.textInfo}> SOLES</Text>
          <Text style={styles.textInfo}>
            {' '}
            {dataXml?.['cac:PaymentTerms']?.[0]?.['cbc:PaymentMeansID']}
          </Text>
        </View>
        <View
          style={{
            position: 'absolute',
            top: '32.4%',
            left: '6%',
            width: 527,
            flexDirection: 'row',
          }}
        >
          <View style={{ width: '3.2%' }}>
            <Text style={styles.textBody}>1 </Text>
          </View>
          <View style={{ width: '7%' }}>
            <Text style={styles.textBody}>
              {dataXml?.['cac:InvoiceLine']?.['cbc:InvoicedQuantity']?.['_']}
            </Text>
          </View>
          <View style={{ width: '4.9%' }}>
            <Text style={styles.textBody}>UNI</Text>
          </View>
          <View style={{ width: '45.9%' }}>
            <Text style={{ ...styles.textBody, textAlign: 'left' }}>
              {dataXml?.['cac:InvoiceLine']?.['cac:Item']?.['cbc:Description']}
            </Text>
          </View>
          <View style={{ width: '7.8%' }}>
            <Text style={styles.textBody}>
              {
                dataXml?.['cac:InvoiceLine']?.['cac:Price']?.[
                  'cbc:PriceAmount'
                ]?.['_']
              }
            </Text>
          </View>
          <View style={{ width: '7.3%' }}>
            <Text style={styles.textBody}>
              {dataXml?.['cac:TaxTotal']?.['cbc:TaxAmount']?.['_']}{' '}
            </Text>
          </View>
          <View style={{ width: '8.1%' }}>
            <Text style={styles.textBody}>
              {
                dataXml?.['cac:TaxTotal']?.['cac:TaxSubtotal']?.[
                  'cbc:TaxableAmount'
                ]?.['_']
              }{' '}
            </Text>
          </View>
          <View style={{ width: '7.4%' }}>
            <Text style={styles.textBody}>0.00 NOSE</Text>
          </View>
          <View style={{ width: '8.4%' }}>
            <Text style={styles.textBody}>
              {
                dataXml?.['cac:LegalMonetaryTotal']?.['cbc:PayableAmount']?.[
                  '_'
                ]
              }{' '}
            </Text>
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            top: '77%',
            left: '6%',
            width: 527,
            flexDirection: 'row',
          }}
        >
          <Text style={styles.textBody}>{dataXml?.['cbc:Note']['_']} </Text>
        </View>
        <View
          style={{
            position: 'absolute',
            top: '79.3%',
            left: '82.5%',
            width: '11.2%',
            gap: 2.4,
            alignItems: 'flex-end',
          }}
        >
          <Text style={styles.textInfo}>
            {' '}
            S/.{' '}
            {
              dataXml?.['cac:TaxTotal']?.['cac:TaxSubtotal']?.[
                'cbc:TaxableAmount'
              ]?.['_']
            }
          </Text>
          <Text style={styles.textInfo}> S/. NOSE</Text>
          <Text style={styles.textInfo}> S/. NOSE</Text>
          <Text style={styles.textInfo}>
            {' '}
            S/.{' '}
            {
              dataXml?.['cac:InvoiceLine']?.['cac:Price']?.[
                'cbc:PriceAmount'
              ]?.['_']
            }
          </Text>
          <Text style={styles.textInfo}> S/. NOSE</Text>
          <Text style={styles.textInfo}> S/. NOSE</Text>
          <Text style={styles.textInfo}>
            {' '}
            {dataXml?.['cac:TaxTotal']?.['cbc:TaxAmount']?.['_']}
          </Text>
          <Text style={styles.textInfo}> S/. NOSE</Text>
        </View>
        <View
          style={{
            position: 'absolute',
            top: '92%',
            left: '82.5%',
            width: '11.2%',
            gap: 2.4,
            alignItems: 'flex-end',
          }}
        >
          <Text style={styles.textTotalPrice}>
            {' '}
            S/.{' '}
            {
              dataXml?.['cac:TaxTotal']?.['cac:TaxSubtotal']?.[
                'cbc:TaxableAmount'
              ]?.['_']
            }
          </Text>
        </View>
        {templateImg && (
          <Image
            src={templateImg}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              zIndex: -1,
            }}
          />
        )}
      </Page>
    </Document>
  );
};
