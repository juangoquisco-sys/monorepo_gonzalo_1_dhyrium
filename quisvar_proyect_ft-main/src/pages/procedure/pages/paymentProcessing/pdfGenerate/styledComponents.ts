import { StyleSheet, Font } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });
export const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    paddingHorizontal: 64,
    paddingVertical: 44,
    flex: 1,
    position: 'relative',
  },
  pageA5: {
    flexDirection: 'column',
    paddingHorizontal: 47,
    paddingVertical: 23,
    flex: 1,
    position: 'relative',
  },
  title: {
    fontSize: 11,
    marginBottom: 10,
    textAlign: 'center',
    textDecoration: 'underline',
    fontFamily: 'Arial Narrow Bold',
  },
  section: {
    fontSize: 11,
  },
  table: {
    width: '100%',
    // border: '1px solid #000',
    fontSize: 11,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    padding: 6,
    border: '1px solid #000',
  },
  header: {
    fontSize: 11,
    fontFamily: 'Arial Narrow',
    textTransform: 'uppercase',
  },
  headerBold: {
    fontSize: 11,
    fontFamily: 'Arial Narrow Bold',
  },
  body: {
    fontSize: 11,
    textAlign: 'justify',
    marginBottom: 10,
    fontFamily: 'Arial Narrow',
  },
  headerContent: {
    flexDirection: 'column',
    gap: 10,
  },
  leftInfo: {
    width: '30%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rigthInfo: {
    width: '70%',
  },
  line: {
    borderBottom: 1,
    borderColor: 'black',
    marginVertical: 10,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
  },
  headerLong: {
    fontSize: 11,
    flexWrap: 'wrap',
    fontFamily: 'Arial Narrow',
    textTransform: 'uppercase',
  },
  sign: {
    width: '60%',
    height: 1,
    backgroundColor: 'black',
    marginBottom: '5px',
  },
  signArea: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    top: 64,
  },
  listItem: {
    flexDirection: 'row',
    fontSize: 11,
    textAlign: 'justify',
    fontFamily: 'Arial Narrow',
  },
  listContainer: {
    marginBottom: 15,
    flexDirection: 'column',
    gap: 5,
  },
  rowList: {
    flexDirection: 'row',
    gap: 3,
  },
});
