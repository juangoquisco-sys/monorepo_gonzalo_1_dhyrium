import { StyleSheet, Font } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });
export const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    paddingHorizontal: 30,
    paddingVertical: 64,
  },
  pageA5: {
    flexDirection: 'column',
    paddingHorizontal: 47,
    paddingVertical: 23,
    flex: 1,
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    margin: 'auto',
  },
  headers: {
    fontSize: 8,
    marginTop: 5,
    textAlign: 'center',
  },
  attendance: {
    flexDirection: 'row',
    borderStyle: 'solid',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  attendanceItem: {
    fontSize: 8,
    width: '100%',
    paddingVertical: 5,
    display: 'flex',
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    width: '100%',
    flexDirection: 'row',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  totalCurrency: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  information: {
    margin: 'auto',
    flexDirection: 'row',
  },
  title: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottom: 0,
  },
});
