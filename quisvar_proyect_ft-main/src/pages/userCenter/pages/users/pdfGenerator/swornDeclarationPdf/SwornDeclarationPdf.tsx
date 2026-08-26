import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './swornDeclarationStyle';
import { deleteExtension } from '@/utils/tools';
import type { SwornDeclaration, UserForm } from '../../models/types';
import { formatFullDateUtc } from '@/utils/dayjsSpanish';

interface SwornDeclarationPdfProps {
  data: UserForm & SwornDeclaration;
}
const SwornDeclarationPdf = ({ data }: SwornDeclarationPdfProps) => {
  const formatDate = formatFullDateUtc(data.declarationDate);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>
            DECLARACIÓN JURADA DE CUMPLIMIENTO DE DIRECTIVAS DE LA COORPORACIÓN
            DHYRIUM
          </Text>
        </View>
        <Text style={styles.text}>
          Yo,{' '}
          <Text style={styles.textBold}>
            {data.firstName} {data.lastName}
          </Text>{' '}
          con DNI: <Text style={styles.textBold}>{data.dni} </Text>
          domiciliado en <Text style={styles.textBold}>{data.address}</Text>,
          del Distrito de {data.district}, provincia de {data.province},
          Departamento de {data.department}, conste por el presente documento
          que me comprometo a cumplir las directivas y condiciones que detalla
          el presente documento.
        </Text>
        <View style={{ marginLeft: 50 }}>
          {data?.declarations?.map(declaration => (
            <Text style={styles.text} key={declaration}>
              ■ Cumplir con las directivas: {deleteExtension(declaration)}
            </Text>
          ))}
        </View>
        <Text style={styles.subtitle}>PRIMERO: CARGO</Text>
        <Text style={styles.text}>
          Me comprometo a desempeñarme en el cargo de{' '}
          <Text style={styles.textBold}>{data.roleName}</Text>, esta regirá
          desde el día de inicio de labores en las instalaciones del grupo hasta
          el último día de labores, deberá entregar con un acta de entrega
          acompañado con un informe situacional detallando las labores
          realizadas y la meta alcanzada durante mi estadía.
        </Text>

        {data.typeDeclaration === 'administrative' && (
          <>
            <Text style={styles.subtitle}>SEGUNDO: RESPONSABILIDADES </Text>
            <Text style={styles.text}>
              Me comprometo a no divulgar los derechos intelectuales del grupo
              fueran divulgados de comprobarse me comprometo a ser procesado
              conforme al código civil, código penal. Así mismo resarcir los
              daños y perjuicios calculadas conforme ley.{'\n'}
              Me comprometo a no llegar a agredir, denigrar, difamar y/o
              comentar en y estos contravenido con los derechos fundamentales de
              la empresa o las personas que laboran en la empresa, de
              comprobarse la vilipendio me comprometo a ser procesado conforme
              al código civil, código penal. Así mismo resarcir los daños y
              perjuicios calculadas conforme ley a la persona y al grupo.
            </Text>
            <Text style={styles.subtitle}>TERCERO: PENALIDADES</Text>
            <Text style={styles.text}>
              Me comprometo a no llegar al incumplimiento; por retiro anticipado
              al tiempo de contrato o abandono de cargo por más de 4 días, sin
              reportase, la multa será del 50% del monto contractual por el
              tiempo estipulado en el contrato. siendo está pudiendo ser proceda
              en código civil, código penal y otros que aplique la de acuerdo
              ley Me comprometo a no llegar al incumplimiento de funciones; en
              caso que no cumpla las funciones estipuladas en el contrato, la
              multa será del 5% del monto contractual calculado al mes. Siendo
              está pudiendo ser procedas en código civil, código penal y código
              penal y otros que aplique de acuerdo ley.
            </Text>
            <Text style={styles.subtitle}>CUARTO: DECLARO BAJO JURAMENTO </Text>
            <Text style={styles.text}>
              La presente declaración jurada, la efectúo de buena fe, basado en
              el principio de presunción de veracidad consagrado en el numeral
              1.7 del Artículo IV del Título Preliminar de la Ley N° 27444 - Ley
              de Procedimiento Administrativo General cuyo Texto Único Ordenado
              fue aprobado por Decreto Supremo Nº 004-2019-JUS, código civil y
              penal. Me afirmo y me ratifico en lo expresado, en señal de lo
              cual firmo el presente documento en la ciudad de Puno, el día{' '}
              {formatDate}.
            </Text>
          </>
        )}
        {data.typeDeclaration === 'technical' && (
          <>
            <Text style={styles.subtitle}>
              SEGUNDO: PERIODO MÍNIMO DE ESTADÍA{' '}
            </Text>
            <Text style={styles.text}>
              Me comprometo a cumplir el tiempo mínimo de estadía es de{' '}
              <Text style={styles.textBold}>
                {data.declarationMonths}
                {data.declarationMonths == 1 ? <> MES</> : <> MESES</>}
              </Text>
              , el cual deberá cumplir desde el día de la declaración jurada
              hasta el día de traspasado de cargo o entrega de cargo, este
              tiempo es considerado PERIODO DE PRUEBA.{'\n'}
              Me comprometo ha presentar mi carta de no continuidad en el cargo
              que desempeño con una anticipación de 15 días hábiles, así mismo
              me hago responsable de traer una persona que desempeñe mis
              labores.
            </Text>
            <Text style={styles.subtitle}>TERCERO: PAGO </Text>
            <View>
              <Text style={styles.text}>
                Estoy de acuerdo a cobrar por cada tarea ejecutado, que se
                muestra en el siguiente ejemplo.{'\n'}
              </Text>
              <View style={{ width: '100%' }}>
                <Image
                  src={'/img/PAGO-QUISVAR.png'}
                  style={{ width: '100%' }}
                />
              </View>
              <Text style={styles.text}>
                Estoy de acuerdo que estas valorizaciones (tareas) vienen
                conformadas, elaboradas y aprobadas conforme la necesidad del
                proyecto y las directivas correspondientes.
              </Text>
            </View>

            <Text style={styles.subtitle}>CUARTO: FORMA DE PAGO </Text>
            <View>
              <Text style={styles.text}>
                Estoy de acuerdo que los pagos se den en dos partes{'\n'}
              </Text>
              <View style={{ marginLeft: 50 }}>
                <Text style={styles.text}>
                  ■ Me comprometo a solicitar mi primer pago que consiste, una
                  vez culminado cada periodo debo presentar mi informe de
                  valorización {'(tareas)'} , en el cual debo solicitar el
                  adelanto del 30% al 60% de mi valoración.
                </Text>
                <Text style={styles.text}>
                  ■ Me comprometo a solicitar mi segundo pago, una vez aprobado
                  el expediente final en los ministerios y/o entes evaluadores
                  debo presentar mi informe de liquidación de valorizaciones{' '}
                  {'(tareas)'}, en el cual debo solicitar porcentaje restante
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>QUINTO: RESPONSABILIDADES</Text>
            <Text style={styles.text}>
              Me comprometo a no divulgar los derechos intelectuales del grupo
              de comprobarse me comprometo a ser procesado conforme al código
              civil, código penal. Así mismo resarcir los daños y perjuicios
              calculadas conforme ley.{'\n'}
              Me comprometo a no llegar a agredir, denigrar, difamar y/o
              comentar en y estos contravenido con los derechos fundamentales de
              la empresa o las personas que laboran en la empresa, de
              comprobarse la vilipendio me comprometo a ser procesado conforme
              al código civil, código penal. Así mismo resarcir los daños y
              perjuicios calculadas conforme ley a la persona y al grupo.{'\n'}
              Me comprometo a enseñar a mis compañeros de labores, facilitando
              videos tutoriales, manales, normas, entre otros documentos que
              faciliten el desempeño y mejoren nuestra productividad, así mi
              persona se compromete a elaborar videos tutoriales.{'\n'}
              Me comprometo a permanecer el periodo de prueba, en caso que me
              reitérame antes de tiempo pagare una multa equivalente a dos
              Unidad Impositiva Tributaria {'(UIT)'}.
            </Text>
            <Text style={styles.subtitle}>SEXTO: PENALIDADES</Text>
            <Text style={styles.text}>
              Me comprometo a no llegar al incumplimiento; por retiro anticipado
              al tiempo de contrato o abandono de cargo por más de 4 días, sin
              reportase, la multa será del 50% del monto contractual por el
              tiempo estipulado en el contrato siendo este agregado al cuarto
              párrafo mencionado en la cláusula quinta. siendo está pudiendo ser
              proceda en código civil, código penal y otros que aplique la de
              acuerdo ley.{'\n'}
              Me comprometo a no llegar al incumplimiento de funciones; en caso
              que no cumpla las funciones estipuladas en el contrato, la multa
              será del 5% del monto contractual calculado al mes. Siendo está
              pudiendo ser procedas en código civil, código penal y código penal
              y otros que aplique la de acuerdo ley.
            </Text>
            <Text style={styles.subtitle}>SEPTIMO: DESPIDO</Text>
            <Text style={styles.text}>
              Estoy de acuerdo que la empresa prescinda de mis servicios
              profesiones por incumpliendo de las directivas, metas y
              compromisos de trabajo.
            </Text>
            <Text style={styles.subtitle}>OCTAVO: DECLARO BAJO JURAMENTO</Text>
            <Text style={styles.text}>
              La presente declaración jurada, la efectúo de buena fe, basado en
              el principio de presunción de veracidad consagrado en el numeral
              1.7 del Artículo IV del Título Preliminar de la Ley N° 27444 - Ley
              de Procedimiento Administrativo General cuyo Texto Único Ordenado
              fue aprobado por Decreto Supremo Nº 004-2019-JUS, código civil y
              penal.{'\n'}
              Me afirmo y me ratifico en lo expresado, en señal de lo cual firmo
              el presente documento en la ciudad de Puno, el día {formatDate}.
            </Text>
          </>
        )}

        <View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={styles.signText}>Firma y huella digital</Text>
        </View>
      </Page>
    </Document>
  );
};

export default SwornDeclarationPdf;
