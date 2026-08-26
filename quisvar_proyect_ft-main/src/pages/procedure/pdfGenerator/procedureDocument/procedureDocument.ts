import { URL } from '@/services/axiosInstance';
import type { Profile } from '@/types/types';
import { degreeAbrv } from '@/utils/tools';
import { formatFullDateUtc } from '@/utils/dayjsSpanish';
import type { ToData, TypeProcedure } from '../../models/types';
import './procedureDocument.css';

interface ProcedureDocumentProps {
  title: string;
  ccProfiles: ToData[];
  subject: string;
  body: string;
  fromProfile: Profile;
  toProfile: ToData | null;
  size: 'a4' | 'a5';
  type: TypeProcedure;
  signature?: boolean;
}

const procedureDocument = ({
  subject,
  title,
  body,
  fromProfile,
  toProfile,
  size,
  ccProfiles,
  type,
  signature = false,
}: ProcedureDocumentProps) => {
  const from = `${degreeAbrv(fromProfile.degree, fromProfile.job)}. ${
    fromProfile.firstName + ' ' + fromProfile.lastName
  }`;
  const fromPosition = fromProfile.description;
  const to =
    toProfile &&
    `${degreeAbrv(toProfile.degree, toProfile.job)}. ${toProfile?.name}`;
  const toPosition = toProfile?.position;

  const data = [
    { textOne: 'Para', textTwo: to, textThre: toPosition },
    { textOne: 'De', textTwo: from, textThre: fromPosition },
    { textOne: 'Asunto', textTwo: subject },
    { textOne: 'Fecha', textTwo: formatFullDateUtc() },
  ];
  const token = localStorage.getItem('token');
  return `
  <div class="procedureDocument-main procedureDocument-${size}" >
    <p class="procedureDocument-title">${title}</p>
    <div class="procedureDocument-title-header-main">
      ${data
        .map(
          ({ textOne, textTwo, textThre }) => `
          <div class="procedureDocument-title-header-content"> 
            <span class="procedureDocument-header-text-title">
              ${textOne}
            </span>
            <div class="procedureDocument-flex-column">
             ${
               textTwo
                 ? ` <span class="procedureDocument-right-text procedureDocument-font-normal">
                <span class="procedureDocument-font-bold">:</span> 
                <div class="procedureDocument-flex-column">
                  <span>${textTwo}</span>
                  ${textThre ? ` <strong>${textThre ?? ''}</strong>` : ''}
                </div>
              </span>`
                 : ''
             }
              ${
                textOne === 'Para' &&
                type === 'comunication' &&
                ccProfiles.length > 0
                  ? `
                <div class="procedureDocument-flex-column-gap">
                  ${ccProfiles
                    .map(
                      ({ degree, name, position, job }) =>
                        `
                    <span class="procedureDocument-right-text">
                      <strong>:</strong> 
                      <div class="procedureDocument-flex-column">
                        <span>${`${degreeAbrv(degree, job)}. ${name}`}</span>
                        <strong>${position ?? ''}</strong>
                      </div>
                      
                    </span>
                    `
                    )
                    .join('')}
                </div>            
                    `
                  : ''
              }
            </div>
          </div>
          ${
            textOne === 'De' && type !== 'comunication' && ccProfiles.length > 0
              ? `
            <div class="procedureDocument-title-header-content"> 
              <span class="procedureDocument-header-text-title">
              CC
              </span>
              <div class="procedureDocument-flex-column-gap">
                ${ccProfiles
                  .map(
                    ({ degree, name, position, job }) =>
                      `
                  <span class="procedureDocument-right-text">
                    <strong>:</strong> 
                    <div class="procedureDocument-flex-column">
                      <span>${`${degreeAbrv(degree, job)}. ${name}`}</span>
                      <strong>${position ?? ''}</strong>
                    </div>
                    
                  </span>
                  `
                  )
                  .join('')}
              </div>
            </div> `
              : ''
          }
          
          `
        )
        .join('')}    
    </div>
    <div class="line"></div>
    <div class="procedureDocument-font-normal main-body">${body}</div>      
   ${
     signature
       ? ` 
    <div class="procedureDocument-sign">
      <img src=${`${URL}/api/v1/encrypt/${fromProfile.dni}?token=${token}`} class="procedureDocument-sign-img"/>
      <span class="procedureDocument-sign-line">${from}</span>
      <span>DNI: ${fromProfile.dni}</span>
    </div>`
       : ''
   }
  </div>`;
};

export default procedureDocument;
