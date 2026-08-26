import { StyleSheet, Font } from '@react-pdf/renderer';
import ArialNarrowBold from '/fonts/Arial-Narrow-Bold.ttf';
import ArialNarrow from '/fonts/Arial-Narrow.ttf';
Font.register({ family: 'Arial Narrow Bold', src: ArialNarrowBold });
Font.register({ family: 'Arial Narrow', src: ArialNarrow });
export const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: 'white',
    gap: 20,
    paddingHorizontal: 30,
    paddingVertical: 34,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Arial Narrow',
  },
  textInfo: {
    fontSize: 9,
    fontFamily: 'Arial Narrow',
  },
  textTotalPrice: {
    fontSize: 10,
    color: 'white',
    fontFamily: 'Arial Narrow Bold',
  },
  textBody: {
    fontSize: 7,
    textAlign: 'right',
    paddingHorizontal: 2,
  },
  dropdownLevel: {
    overflow: 'hidden',
    marginTop: 1,
    marginBottom: 1,
  },

  title: {
    fontSize: 16,
    width: '100%',
    textAlign: 'center',
    color: '#0070C0',
    fontWeight: 700,
    fontFamily: 'Arial Narrow Bold',
    letterSpacing: 0.5,
  },
  fontBold: {
    fontFamily: 'Arial Narrow Bold',
  },
  isProject: {
    color: '#FF4B4B',
    fontFamily: 'Arial Narrow Bold',
  },
  isArea: {
    color: '#70AD47',
    fontFamily: 'Arial Narrow Bold',
  },
  isInclude: {
    color: '#0070C0',
  },
  infoTextContainer: {
    alignItems: 'flex-end',
    width: 40,
  },
  infoText: {
    color: '#464f60',
    fontSize: 7,
  },
  infoDetailText: { color: '#687182', fontSize: 8 },
  infoContainer: {
    gap: 5,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  levelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.2,
    alignItems: 'flex-end',
  },
});
