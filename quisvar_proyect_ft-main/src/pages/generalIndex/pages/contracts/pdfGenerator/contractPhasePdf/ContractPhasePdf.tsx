import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { Contract } from '@/types/types';
import docImg from '/img/plantillaDocs.png';
import { styles } from './contractPhaseStyle';
import { NumerosALetras } from '@/utils/numerosALetras';
import type { PhaseData } from '../../pages/detailsContracts/models/type';
import dayjsSpanish, { formatFullDateUtc } from '@/utils/dayjsSpanish';
import { parseContractPhases } from '../../utils/tools';

interface ContractPhasePdfProps {
  contract: Contract;
}
const ContractPhasePdf = ({ contract }: ContractPhasePdfProps) => {
  const phases: PhaseData[] = parseContractPhases(contract.phases);
  const payData = phases
    .map(pha => pha.payData)
    .flat()
    .filter(pha => pha);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageBackgroundContainer} fixed={true}>
          <Image src={docImg} style={styles.imageBackground} />
        </View>
        <View style={styles.container}>
          <View
            style={{
              alignItems: 'center',
            }}
          >
            <Text style={styles.title}>{contract.contractNumber}</Text>
          </View>
          <View style={{}}>
            <View style={styles.textContain}>
              <Text style={styles.number}>1.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>NOMBRE DEL PROYECTO:</Text>{' '}
                {contract.projectName}
              </Text>
            </View>
            <View style={styles.textContain}>
              <Text style={styles.number}>2.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>NOMBRE CORTO DEL PROYECTO:</Text>{' '}
                {contract.projectShortName}
              </Text>
            </View>
            <View style={styles.textContain}>
              <Text style={styles.number}>3.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>CUI:</Text> {contract.cui}
              </Text>
            </View>
            <View style={styles.textContain}>
              <Text style={styles.number}>4.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>TIPO:</Text>{' '}
                {contract.projectName}
              </Text>
            </View>
            <View style={styles.textContain}>
              <Text style={styles.number}>5.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>EMPRESA O CONSORCIO:</Text>{' '}
                {contract.consortium.name || contract.company.name}
              </Text>
            </View>
            <View style={styles.textContain}>
              <Text style={styles.number}>6.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>REPRESENTANTE:</Text>{' '}
                {contract.consortium.manager ||
                  (contract.company.manager as string)}
              </Text>
            </View>
            <View style={styles.textContain}>
              <Text style={styles.number}>7.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>
                  FECHA DE FIRMA DE CONTRATO:{' '}
                </Text>{' '}
                {contract.createdAt
                  ? formatFullDateUtc(contract.createdAt)
                  : '-'}
              </Text>
            </View>
            <View style={styles.textContain}>
              <Text style={styles.number}>8.</Text>
              <Text style={styles.text}>
                <Text style={styles.textBold}>MONTO DEL CONTRATO: </Text>
                <Text style={styles.textBlue}> S/. {contract.amount} </Text>(
                {NumerosALetras(+contract.amount)})
              </Text>
            </View>
            {phases.map((phase, i) => (
              <View style={styles.textContain} key={phase.id}>
                <Text style={styles.number}>{i + 9}.</Text>
                <Text style={styles.text}>
                  <Text style={styles.textBold}>
                    CARTA ENTREGABLE {i + 1}:{' '}
                  </Text>{' '}
                  <Text style={styles.textRedBold}>
                    {contract.createdAt
                      ? formatFullDateUtc(
                          dayjsSpanish(contract.createdAt).add(
                            phase.realDay ?? 0,
                            'days'
                          )
                        )
                      : '-'}
                  </Text>{' '}
                  (a los {phase.realDay} dias de plazo){' '}
                  <Text style={styles.textSkyBlue}>{phase.description}.</Text>{' '}
                  {phase.name && 'Se entrega el expediente mediante '}
                  {phase.name ? (
                    <Text style={styles.textPurpleBold}>
                      {phase.name.toUpperCase()}.
                    </Text>
                  ) : (
                    <Text style={styles.textPurpleBold}>
                      NO ENTREGADO – PLAZO VENCIDO.
                    </Text>
                  )}
                </Text>
              </View>
            ))}
            {payData.map((pay, i) => (
              <View style={styles.textContain} key={pay.id}>
                <Text style={styles.number}>{i + 9 + phases.length}.</Text>
                <Text style={styles.text}>
                  <Text style={styles.textBold}>CARTA DE PAGO {i + 1}: </Text>{' '}
                  <Text style={styles.textRedBold}>
                    {pay.percentage} {pay.amount}
                  </Text>{' '}
                  {pay.name && (
                    <Text>
                      Se{' '}
                      <Text style={styles.textBold}>
                        SOLICITA EL PRIMER PAGO
                      </Text>{' '}
                      con{' '}
                    </Text>
                  )}
                  <Text style={styles.textPurpleBold}>
                    {pay.name.toUpperCase() || '- NO SOLICITADO'}
                  </Text>
                </Text>
              </View>
            ))}
            <View
              style={{
                ...styles.textContain,
                borderBottom: 1,
                flexDirection: 'column',
              }}
            >
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.number}>
                  {9 + phases.length + payData.length}
                </Text>
                <Text style={styles.text}>
                  <Text style={styles.textBold}>OBSERVACIONES: </Text>
                </Text>
              </View>
              {contract.observations.split('\n').map((text, i) => (
                <View style={{ flexDirection: 'row', marginLeft: 20 }} key={i}>
                  <Text style={styles.number}>-</Text>
                  <Text style={styles.text}>{text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ContractPhasePdf;
