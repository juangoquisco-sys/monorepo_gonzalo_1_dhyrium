import { Font, StyleSheet } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });

export const styles = StyleSheet.create({
  /////
  page: {
    flexDirection: 'column',
    backgroundColor: 'white',
    gap: 20,
    paddingHorizontal: 63,
    paddingVertical: 34,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '12%',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  invoiceBox: {
    paddingHorizontal: 40,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
    justifyContent: 'center',
  },
  logo: {
    height: '100%',
  },

  info: {},

  infoTextleft: {
    width: '30%',
    fontSize: 11,
  },

  infoTextRight: {
    width: '60%',
    fontSize: 11,
    fontFamily: 'Arial Narrow Bold',
  },
  infoTextPendingleft: {
    width: '40%',
    fontSize: 10,
  },

  infoTextPendingRight: {
    width: '60%',
    fontSize: 10,
    fontFamily: 'Arial Narrow Bold',
  },
  pageBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
  },
  imageBackground: {
    height: '100%',
    width: '100%',
  },

  container: {
    flex: 1,
    marginHorizontal: 70,
    marginVertical: 70,
  },
  title: {
    borderStyle: 'solid',
    borderBottomWidth: 1,
    fontSize: 12,
    fontFamily: 'Arial Narrow Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Arial Narrow Bold',
    marginVertical: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Arial Narrow',
    textAlign: 'justify',
  },
  textAmount: {
    width: '50%',
    fontSize: 11,
    fontFamily: 'Arial Narrow',
    textAlign: 'right',
  },
  textSmall: {
    fontSize: 10,
    fontFamily: 'Arial Narrow',
    textAlign: 'justify',
  },
  textSmallBold: {
    fontSize: 10,
    fontFamily: 'Arial Narrow Bold',
    textAlign: 'justify',
  },
  textSmallGray: {
    fontSize: 10,
    fontFamily: 'Arial Narrow',
    color: '#606060',
  },
  textBold: {
    fontSize: 11,
    fontFamily: 'Arial Narrow Bold',
  },
  textRed: {
    color: 'red',
  },
  textRedBold: {
    fontFamily: 'Arial Narrow Bold',
    color: 'red',
  },
  textTableHeader: {
    fontFamily: 'Arial Narrow',
    fontSize: 10,
    paddingVertical: 8,
    paddingHorizontal: 9,
    color: 'white',
  },
  textTableBody: {
    fontFamily: 'Arial Narrow',
    fontSize: 10,
    paddingVertical: 8,
    paddingHorizontal: 9,
  },

  textBlue: {
    fontFamily: 'Arial Narrow Bold',
    color: 'blue',
  },
  noWrap: {
    overflow: 'hidden',
  },
  signText: {
    fontSize: 11,
    fontFamily: 'Arial Narrow Bold',
    borderTopWidth: 1,
    width: 200,
    marginTop: 10,
    textAlign: 'center',
  },
  paddingLeft: {
    paddingLeft: 12,
    paddingRight: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 63,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '5%',
  },
});
