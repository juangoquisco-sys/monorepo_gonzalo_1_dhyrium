import { Document, Page, Image, Text, View } from '@react-pdf/renderer';
import { styles } from './styleInvoicePdf';

import logoImgDefault from '/img/quisvar_logo_invoice.png';
import ubi from '/img/ubi.png';
import phone from '/img/phone.png';
import email from '/img/email.png';
import type { CompaniesSelect } from '@/types/types';
import type { InvoiceXML } from '@/types/typeFactura';
import { MONEY, MONEY_INVOICE, UNIT } from '@/utils/invoiceData';
import { URL } from '@/services/axiosInstance';

interface InvoicePdfProps {
  dataXml: InvoiceXML;
  company: CompaniesSelect;
}

const InvoicePdf = ({ dataXml, company }: InvoicePdfProps) => {
  const primaryColor = company.color;
  const logoImg =
    `${URL}/images/img/companies/${company?.img}` || logoImgDefault;
  const currencySymbol =
    MONEY_INVOICE[
      dataXml['cbc:DocumentCurrencyCode']['_'] as keyof typeof MONEY_INVOICE
    ];

  const dues = dataXml['cac:PaymentTerms'].find(el =>
    el['cbc:PaymentMeansID'].includes('Cuota')
  );
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={{
            position: 'absolute',
            width: 20,
            bottom: 0,
            height: '80%',
            left: 0,
            backgroundColor: primaryColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 20,
            height: '30%',
            top: 0,
            left: 0,
            backgroundColor: primaryColor,
            opacity: 0.5,
          }}
        />
        <View style={styles.header}>
          <Image src={logoImg} style={styles.logo} />
          <View style={{ ...styles.invoiceBox, borderColor: primaryColor }}>
            <Text style={{ ...styles.textBold }}>FACTURA ELECTRONICA</Text>
            <Text style={{ ...styles.text }}>
              RUC:
              {
                dataXml['cac:AccountingSupplierParty']['cac:Party'][
                  'cac:PartyIdentification'
                ]['cbc:ID']['_']
              }
            </Text>
            <Text style={{ ...styles.text }}>{dataXml['cbc:ID']}</Text>
          </View>
        </View>
        <View style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.infoTextleft}>Señor(es):</Text>
            <Text style={styles.infoTextRight}>
              {
                dataXml?.['cac:AccountingCustomerParty']?.['cac:Party']?.[
                  'cac:PartyLegalEntity'
                ]?.['cbc:RegistrationName']
              }
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.infoTextleft}>RUC:</Text>
            <Text style={styles.infoTextRight}>
              {
                dataXml['cac:AccountingSupplierParty']['cac:Party'][
                  'cac:PartyIdentification'
                ]['cbc:ID']['_']
              }
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.infoTextleft}>Dirección:</Text>
            <Text style={styles.infoTextRight}>
              {
                dataXml?.['cac:BuyerCustomerParty']?.['cac:Party']?.[
                  'cac:PartyLegalEntity'
                ]?.['cac:RegistrationAddress']?.['cac:AddressLine']?.[
                  'cbc:Line'
                ]
              }
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.infoTextleft}>Fecha de Emisión:</Text>
            <Text style={styles.infoTextRight}>{dataXml['cbc:IssueDate']}</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.infoTextleft}>Tipo de moneda:</Text>
            <Text style={styles.infoTextRight}>
              {
                MONEY[
                  dataXml['cbc:DocumentCurrencyCode']['_'] as keyof typeof MONEY
                ]
              }
            </Text>
          </View>
        </View>
        <View style={{ borderBottomWidth: 1 }}>
          <View style={{ backgroundColor: primaryColor, flexDirection: 'row' }}>
            <Text style={{ ...styles.textTableHeader, width: '15%' }}>
              CANTIDAD
            </Text>
            <Text style={{ ...styles.textTableHeader, width: '15%' }}>
              UNIDAD
            </Text>
            <Text style={{ ...styles.textTableHeader, width: '55%' }}>
              DESCRIPCIÓN
            </Text>
            <Text style={{ ...styles.textTableHeader, width: '15%' }}>
              VALOR UNIT.
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ ...styles.textTableBody, width: '15%' }}>
              {dataXml?.['cac:InvoiceLine']?.['cbc:InvoicedQuantity']?.['_']}
            </Text>
            <Text style={{ ...styles.textTableBody, width: '15%' }}>
              {
                UNIT[
                  dataXml?.['cac:InvoiceLine']?.['cbc:InvoicedQuantity']?.['$'][
                    'unitCode'
                  ] as keyof typeof UNIT
                ]
              }
            </Text>
            <Text style={{ ...styles.textTableBody, width: '55%' }}>
              {dataXml?.['cac:InvoiceLine']?.['cac:Item']?.['cbc:Description']}
            </Text>
            <Text style={{ ...styles.textTableBody, width: '15%' }}>
              {
                dataXml?.['cac:InvoiceLine']?.['cac:Price']?.[
                  'cbc:PriceAmount'
                ]?.['_']
              }
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ width: '40%', alignItems: 'flex-end', gap: 5 }}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.textAmount}>Valor Venta :</Text>
              <Text style={styles.textAmount}>
                {currencySymbol}{' '}
                {
                  dataXml['cac:LegalMonetaryTotal']['cbc:LineExtensionAmount'][
                    '_'
                  ]
                }
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.textAmount}>IGV (18%) :</Text>
              <Text style={styles.textAmount}>
                {currencySymbol}{' '}
                {
                  dataXml['cac:TaxTotal']['cac:TaxSubtotal']['cbc:TaxAmount'][
                    '_'
                  ]
                }
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text
                style={{
                  ...styles.textAmount,
                  ...styles.textBold,
                }}
              >
                Importe total :
              </Text>
              <Text
                style={{
                  ...styles.textAmount,
                  ...styles.textBold,
                }}
              >
                {currencySymbol}{' '}
                {dataXml['cac:LegalMonetaryTotal']['cbc:PayableAmount']['_']}
              </Text>
            </View>
          </View>
        </View>

        <Text style={{ ...styles.text }}>{dataXml?.['cbc:Note']['_']}</Text>

        <View style={{ gap: 5, marginVertical: 10 }}>
          <Text style={{ ...styles.textBold, marginBottom: 5 }}>
            Información del crédito
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.infoTextPendingleft}>
              Monto neto pendiente de pago:
            </Text>
            <Text style={styles.infoTextPendingRight}>
              {currencySymbol} {dues?.['cbc:Amount']['_']}
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.infoTextPendingleft}>Total de cuotas:</Text>
            <Text style={styles.infoTextPendingRight}>1</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View
            style={{
              width: '30%',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>N° Cuota</Text>
              <Text style={{ ...styles.textSmall }}>1</Text>
            </View>
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>Fec. Venc.</Text>
              <Text style={{ ...styles.textSmall }}>
                {dues?.['cbc:PaymentDueDate']}
              </Text>
            </View>
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>Monto</Text>
              <Text style={{ ...styles.textSmall }}>
                {' '}
                {dues?.['cbc:Amount']['_']}
              </Text>
            </View>
          </View>
          <View
            style={{
              width: '30%',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>N° Cuota</Text>
              <Text style={{ ...styles.textSmall }}></Text>
            </View>
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>Fec. Venc.</Text>
              <Text style={{ ...styles.textSmall }}></Text>
            </View>
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>Monto</Text>
              <Text style={{ ...styles.textSmall }}></Text>
            </View>
          </View>
          <View
            style={{
              width: '30%',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>N° Cuota</Text>
              <Text style={{ ...styles.textSmall }}></Text>
            </View>
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>Fec. Venc.</Text>
              <Text style={{ ...styles.textSmall }}></Text>
            </View>
            <View style={{ width: '30%', gap: 5 }}>
              <Text style={{ ...styles.textSmallBold }}>Monto</Text>
              <Text style={{ ...styles.textSmall }}></Text>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <View
            style={{
              flexDirection: 'row',
              gap: 5,
              alignItems: 'center',
              width: '40%',
            }}
          >
            <Image src={ubi} style={{ height: 12, width: 10 }} />
            <Text style={{ ...styles.textSmallGray }}>
              {
                dataXml['cac:SellerSupplierParty']['cac:Party'][
                  'cac:PostalAddress'
                ]['cac:AddressLine']['cbc:Line']
              }
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: 5,
              alignItems: 'center',
              width: '25%',
            }}
          >
            <Image src={phone} style={{ height: 10 }} />
            <Text style={styles.textSmallGray}>{company.phone}</Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: 5,
              alignItems: 'center',
              width: '25%',
            }}
          >
            <Image src={email} style={{ height: 10 }} />
            <Text style={styles.textSmallGray}>{company.email}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePdf;
