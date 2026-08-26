import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './specialistDeclarationStyle';
import { formatDateDefault, formatFullDateUtc } from '@/utils/dayjsSpanish';
import type { Tuition } from '@/types/types';

interface Specialist {
  firstName: string;
  lastName: string;
  dni: string;
  career: string;
  tuition: Tuition;
  inscription: string;
  inscriptionDate: string;
  speciality: string;
  //---------------------
  nameContract: string;
  projectName: string;
  cui: string;
  municipio?: string;
  srcImage?: string;
}

enum COLLEGE_SPECIALIST {
  CIP = 'COLEGIO DE INGENIEROS DEL PERU',
  CAP = 'COLEGIO DE ARQUITECTOS DEL PERU',
  CCP = 'COLEGIO DE CONTADORES DEL PERU',
}

interface SpecialistDeclarationPdfProps {
  data?: Specialist;
}

const DEFAULT_SPECIALIST_DECLARATION_DATA: Specialist = {
  firstName: 'JUAN JOSÉ',
  lastName: 'MAMANI COPARI',
  dni: '43559601',
  career: 'INGENIERO CIVIL',
  tuition: 'CIP',
  inscription: '209092',
  inscriptionDate: '2018/01/19',
  speciality: 'JEFE DE PROYECTO',
  nameContract: '02-2023-MDC/CS-1',
  projectName:
    'MEJORAMIENTO Y AMPLIACION DE LOS SERVICIOS DE SALUD DEL ESTABLECIMIENTO DE SALUD CONDURIRI, DEL DISTRITO DE CONDURIRI - PROVINCIA DE EL COLLAO - DEPARTAMENTO DE PUNO',
  cui: '2455435',
  municipio: 'MUNICIPALIDAD DISTRITAL DE CONDURIRI',
  srcImage: '/img/dhyrium_logo.png',
};

const SpecialistDeclarationPdf = ({
  data = DEFAULT_SPECIALIST_DECLARATION_DATA,
}: SpecialistDeclarationPdfProps) => {
  const dateCIP = formatFullDateUtc(data.inscriptionDate);
  const year = formatDateDefault('YYYY').slice(0, 4);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <div style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {data.srcImage && <Image src={data.srcImage} style={styles.logo} />}
            <View style={styles.headerTitle}>
              {data.municipio && <Text>{data.municipio} </Text>}
              <Text>ADJUDICACION SIMPLIFICADA N° {data.nameContract}</Text>
            </View>
          </div>
          {data.srcImage && <Image src={data.srcImage} style={styles.logo} />}
        </View>
        <View
          style={{
            alignItems: 'center',
            paddingBottom: 6,
          }}
        >
          <Text style={styles.title}>DECLARACIÓN JURADA</Text>
        </View>
        <Text style={styles.paragraph}>
          Yo,{' '}
          <Text style={styles.stroke}>
            {data.firstName.toUpperCase()} {data.lastName.toUpperCase()}
          </Text>
          , con <Text style={styles.stroke}>DNI N° {data.dni}</Text> con título
          profesional de <Text style={styles.stroke}>{data.career}</Text>,
          colegiado en{' '}
          <Text style={styles.stroke}> {COLLEGE_SPECIALIST[data.tuition]}</Text>
          , Registro N° <Text style={styles.stroke}>{data.inscription}</Text>,
          con fecha de Colegiatura: {dateCIP}.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.stroke}>DECLARO BAJO JURAMENTO </Text>
          que mi persona participa como{' '}
          <Text style={styles.stroke}>{data.speciality}</Text> en la elaboración
          del Expediente Técnico del proyecto denominado:{' '}
          <Text style={styles.stroke}>
            "{data.projectName}" con CUI {data.cui},{' '}
          </Text>
          del proceso de selección de la{' '}
          <Text style={styles.stroke}>
            ADJUDICACION SIMPLIFICADA N° {data.nameContract}.
          </Text>
        </Text>
        <Text style={styles.paragraph}>
          Realizo la presente declaración jurada manifestando que participo en
          dicha adjudicación en todos los procesos que se desarrollará en la
          elaboración del expediente técnico; asumiendo la responsabilidad
          administrativa, civil, y penal en caso de falsedad de acuerdo al T.U.O
          (Texto Único Ordenado) de la Ley de Procedimiento Administrativo
          General.
        </Text>
        <View
          style={{
            paddingTop: 10,
            alignItems: 'flex-end',
          }}
        >
          <Text style={styles.sumilla}>
            Puno, ______ de___________ del {year}
          </Text>
        </View>
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={styles.signText}>Firma y huella digital</Text>
        </View>
        <View style={styles.attributes}>
          <Text style={styles.attributesText}>
            Nombres y Apellidos: ______________________________________
          </Text>
          <Text style={styles.attributesText}>
            Correo electrónico: ________________________________________
          </Text>
          <Text style={styles.attributesText}>
            Teléfonos: _______________________________________________
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default SpecialistDeclarationPdf;
