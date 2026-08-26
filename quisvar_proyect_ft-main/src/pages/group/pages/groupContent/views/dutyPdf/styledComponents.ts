import { StyleSheet, Font } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });
export const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContent: {
    flexDirection: 'row',
    margin: 'auto',
    // width: '100%',
    // justifyContent: 'space-between'
  },
  headers: {
    fontSize: 8,
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    textTransform: 'uppercase',
    fontFamily: 'Arial Narrow',
  },
  headerBold: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    textTransform: 'uppercase',
    fontSize: 11,
    fontFamily: 'Arial Narrow Bold',
  },
  bold: {
    fontFamily: 'Arial Narrow Bold',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    // display: 'flex',
    // flexDirection: 'row'
  },
});
