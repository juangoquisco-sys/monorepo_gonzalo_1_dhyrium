import { StyleSheet, Font } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
import Calibri from '/fonts/Calibri.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });
Font.register({ family: 'Calibri', src: Calibri });
export const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Arial Narrow Bold',
    letterSpacing: 0.5,
    padding: 2,
    borderWidth: 2,
    justifyContent: 'center',
    width: 200,
    // borderRadius: 20,
  },
  page: {
    flexDirection: 'column',
    backgroundColor: 'white',
    gap: 20,
    paddingHorizontal: 63,
    paddingVertical: 34,
  },
  headers: {
    fontSize: 8,
    margin: 'auto',
    marginTop: 5,
  },
  info: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLeft: {
    gap: 5,
  },
  infoRight: {
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 9,
  },
  textSmall: {
    fontSize: 8,
  },
  signatureUser: { alignItems: 'center', justifyContent: 'center' },
  text_info: {
    fontSize: 9,
    fontFamily: 'Calibri',
  },
  signatureText: {
    fontSize: 9,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    paddingTop: 5,
  },
  footer: {
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 5,
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
  },
  tableCol2: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  signature: {
    marginTop: 140,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
