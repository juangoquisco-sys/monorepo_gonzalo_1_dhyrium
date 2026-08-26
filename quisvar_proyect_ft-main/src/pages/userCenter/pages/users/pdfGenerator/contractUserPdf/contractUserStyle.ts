import { Font, StyleSheet } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });

export const styles = StyleSheet.create({
  /////
  page: {
    top: '0px',
    position: 'absolute',
    width: '100%',
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
  textSmall: {
    fontSize: 10,
    fontFamily: 'Arial Narrow',
    textAlign: 'justify',
  },
  textSmallGray: {
    fontSize: 10,
    fontFamily: 'Arial Narrow',
    textAlign: 'justify',
    color: '#CBCBCB',
  },
  textBold: {
    fontFamily: 'Arial Narrow Bold',
  },
  textRed: {
    color: 'red',
  },
  textRedBold: {
    fontFamily: 'Arial Narrow Bold',
    color: 'red',
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
});
