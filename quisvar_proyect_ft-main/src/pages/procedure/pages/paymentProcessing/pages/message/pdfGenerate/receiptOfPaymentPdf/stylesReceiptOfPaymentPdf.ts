import { StyleSheet, Font } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });
export const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Arial Narrow Bold',
    letterSpacing: 0.5,
    padding: 2,
  },
  title_enum: {
    fontSize: 16,
    color: '#002060',
    border: 3,
    fontWeight: 'bold',
    borderColor: '#00B050',
    textAlign: 'center',
    padding: '4px 10px',
    fontFamily: 'Arial Narrow Bold',
    position: 'absolute',
    right: 0,
    top: -5,
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
  infoLeft: {},
  infoRight: {
    justifyContent: 'space-between',
  },
  textBold: {
    fontSize: 9,
    fontFamily: 'Arial Narrow Bold',
  },
  text: {
    fontSize: 9,
    fontFamily: 'Arial Narrow',
  },
  textName: {
    fontSize: 14,
    fontFamily: 'Arial Narrow Bold',
  },
  signatureText: {
    fontSize: 9,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    fontFamily: 'Arial Narrow',
    paddingTop: 5,
  },
  footer: {
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  textSmall: {
    fontSize: 8,
  },
  signatureUser: { alignItems: 'center', justifyContent: 'center' },
});
