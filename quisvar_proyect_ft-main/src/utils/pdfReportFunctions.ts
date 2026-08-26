import { formatDate } from './formatDate';

type ParagraphElement = {
  type: 'paragraph';
  content: string;
};

type TableElement = {
  type: 'table';
  data: string[][];
};

type ListItemElement = {
  type: 'listItem';
  content: string;
};

type OrderedListElement = {
  type: 'orderedList';
  items: ListItemElement[];
};

type UnorderedListElement = {
  type: 'unorderedList';
  items: ListItemElement[];
};

type DynamicHTMLElement =
  | ParagraphElement
  | TableElement
  | OrderedListElement
  | UnorderedListElement;

export const convertToDynamicObject = (
  htmlString: string
): DynamicHTMLElement[] => {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = htmlString;

  const elements: DynamicHTMLElement[] = [];

  const parseNode = (node: Node): DynamicHTMLElement | null => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;

      if (element.nodeName === 'P') {
        const content = (element.textContent || '').trim();
        if (content) {
          return { type: 'paragraph', content };
        }
      } else if (element.nodeName === 'TABLE') {
        const tableData: string[][] = [];
        const rows = element.querySelectorAll('tr');
        rows.forEach(row => {
          const rowData: string[] = [];
          row.querySelectorAll('td').forEach(cell => {
            rowData.push((cell.textContent || '').trim());
          });
          tableData.push(rowData);
        });
        return { type: 'table', data: tableData };
      } else if (element.nodeName === 'OL' || element.nodeName === 'UL') {
        const listItems: ListItemElement[] = [];
        element.querySelectorAll('li').forEach(li => {
          const listItemContent = (li.textContent || '').trim();
          if (listItemContent) {
            listItems.push({ type: 'listItem', content: listItemContent });
          }
        });

        const listType =
          element.nodeName === 'OL' ? 'orderedList' : 'unorderedList';

        return { type: listType, items: listItems };
      }
    }

    return null;
  };

  const traverseAndParse = (node: Node) => {
    const parsedNode = parseNode(node);
    if (parsedNode) {
      elements.push(parsedNode);
    }

    node.childNodes.forEach(childNode => {
      traverseAndParse(childNode);
    });
  };

  traverseAndParse(tempElement);
  return elements;
};
export const dataInitialPdf = {
  from: '',
  to: '',
  header: '',
  body: [],
  date: formatDate(new Date(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour12: true,
  }),
  dni: '',
  title: '',
  fromDegree: '',
  fromPosition: '',
  toDegree: '',
  toPosition: '',
};
