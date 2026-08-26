import { StyleSheet, Font } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });
export const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    paddingHorizontal: 50,
    paddingVertical: 64,
    gap: 8,
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

  title: {
    borderStyle: 'solid',
    borderBottomWidth: 1,
    fontSize: 13,
    fontFamily: 'Arial Narrow Bold',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Arial Narrow Bold',
  },
  text: {
    fontSize: 11,
    fontFamily: 'Arial Narrow',
    textAlign: 'justify',
  },
  textBold: {
    fontFamily: 'Arial Narrow Bold',
  },
  signText: {
    fontSize: 11,
    fontFamily: 'Arial Narrow',
    borderTopWidth: 1,
    width: 200,
    marginTop: 80,
    textAlign: 'center',
  },
});
