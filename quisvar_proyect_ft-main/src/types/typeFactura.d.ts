interface UBLExtension {
  'ext:ExtensionContent': {
    'sac:AdditionalInformation'?: string;
    'ds:Signature'?: {
      $: {
        Id: string;
      };
      'ds:SignedInfo': {
        'ds:CanonicalizationMethod': {
          $: {
            Algorithm: string;
          };
        };
        'ds:SignatureMethod': {
          $: {
            Algorithm: string;
          };
        };
        'ds:Reference': {
          $: {
            URI: string;
          };
          'ds:Transforms': {
            'ds:Transform': {
              $: {
                Algorithm: string;
              };
            }[];
          };
          'ds:DigestMethod': {
            $: {
              Algorithm: string;
            };
          };
          'ds:DigestValue': string;
        };
        'ds:SignatureValue': string;
        'ds:KeyInfo': {
          'ds:X509Data': {
            'ds:X509Certificate': string;
          };
        };
      };
    };
  };
}

export interface InvoiceXML {
  $: {
    xmlns: string;
    'xmlns:cac': string;
    'xmlns:cbc': string;
    'xmlns:ccts': string;
    'xmlns:ds': string;
    'xmlns:ext': string;
    'xmlns:qdt': string;
    'xmlns:sac': string;
    'xmlns:stat': string;
    'xmlns:udt': string;
    'xmlns:xsi': string;
  };
  'ext:UBLExtensions': {
    'ext:UBLExtension': UBLExtension[];
  };
  'cbc:UBLVersionID': string;
  'cbc:CustomizationID': string;
  'cbc:ID': string;
  'cbc:IssueDate': string;
  'cbc:IssueTime': string;
  'cbc:InvoiceTypeCode': {
    _: string;
    $: {
      listAgencyName: string;
      listID: string;
      listName: string;
      listSchemeURI: string;
      listURI: string;
      name: string;
    };
  };
  'cbc:Note': {
    _: string;
    $: {
      languageLocaleID: string;
    };
  };
  'cbc:DocumentCurrencyCode': {
    _: string;
    $: {
      listAgencyName: string;
      listID: string;
      listName: string;
    };
  };
  'cac:Signature': {
    'cbc:ID': string;
    'cac:SignatoryParty': {
      'cac:PartyName': {
        'cbc:Name': string;
      };
    };
    'cac:DigitalSignatureAttachment': {
      'cac:ExternalReference': {
        'cbc:URI': string;
      };
    };
  };
  'cac:AccountingSupplierParty': {
    'cac:Party': {
      'cac:PartyIdentification': {
        'cbc:ID': {
          _: string;
          $: {
            schemeAgencyName: string;
            schemeID: string;
            schemeName: string;
            schemeURI: string;
          };
        };
      };
      'cac:PartyName': {
        'cbc:Name': string;
      };
      'cac:PartyLegalEntity': {
        'cbc:RegistrationName': string;
        'cac:RegistrationAddress': {
          'cbc:AddressTypeCode': {
            _: string;
            $: {
              listAgencyName: string;
              listName: string;
            };
          };
          'cbc:BuildingNumber': string;
          'cbc:CitySubdivisionName': string;
          'cbc:CityName': string;
          'cbc:CountrySubentity': string;
          'cbc:CountrySubentityCode': string;
          'cbc:District': string;
          'cac:AddressLine': {
            'cbc:Line': string;
          };
          'cac:Country': {
            'cbc:IdentificationCode': string;
          };
        };
      };
    };
  };
  'cac:AccountingCustomerParty': {
    'cac:Party': {
      'cac:PartyIdentification': {
        'cbc:ID': {
          _: string;
          $: {
            schemeAgencyName: string;
            schemeID: string;
            schemeName: string;
            schemeURI: string;
          };
        };
      };
      'cac:PartyLegalEntity': {
        'cbc:RegistrationName': string;
      };
    };
  };
  'cac:BuyerCustomerParty': {
    'cac:Party': {
      'cac:PartyLegalEntity': {
        'cac:RegistrationAddress': {
          'cbc:CitySubdivisionName': string;
          'cbc:CityName': string;
          'cbc:CountrySubentity': string;
          'cbc:CountrySubentityCode': string;
          'cbc:District': string;
          'cac:AddressLine': {
            'cbc:Line': string;
          };
          'cac:Country': {
            'cbc:IdentificationCode': string;
          };
        };
      };
    };
  };
  'cac:SellerSupplierParty': {
    'cac:Party': {
      'cac:PostalAddress': {
        'cbc:ID': string;
        'cbc:CitySubdivisionName': string;
        'cbc:CityName': string;
        'cbc:CountrySubentity': string;
        'cbc:District': string;
        'cac:AddressLine': {
          'cbc:Line': string;
        };
        'cac:Country': {
          'cbc:IdentificationCode': string;
        };
      };
    };
  };
  'cac:PaymentTerms': {
    'cbc:ID': string;
    'cbc:PaymentMeansID': string;
    'cbc:Amount': {
      _: string;
      $: {
        currencyID: string;
      };
    };
    'cbc:PaymentDueDate'?: string;
  }[];
  'cac:TaxTotal': {
    'cbc:TaxAmount': {
      _: string;
      $: {
        currencyID: string;
      };
    };
    'cac:TaxSubtotal': {
      'cbc:TaxableAmount': {
        _: string;
        $: {
          currencyID: string;
        };
      };
      'cbc:TaxAmount': {
        _: string;
        $: {
          currencyID: string;
        };
      };
      'cac:TaxCategory': {
        'cbc:ID': {
          _: string;
          $: {
            schemeAgencyName: string;
            schemeID: string;
            schemeName: string;
          };
        };
        'cbc:Percent': string;
        'cbc:TaxExemptionReasonCode': {
          _: string;
          $: {
            listAgencyName: string;
            listName: string;
            listURI: string;
          };
        };
        'cac:TaxScheme': {
          'cbc:ID': {
            _: string;
            $: {
              schemeAgencyName: string;
              schemeID: string;
              schemeName: string;
            };
          };
          'cbc:Name': string;
          'cbc:TaxTypeCode': string;
        };
      };
    };
  };
  'cac:LegalMonetaryTotal': {
    'cbc:LineExtensionAmount': {
      _: string;
      $: {
        currencyID: string;
      };
    };
    'cbc:TaxInclusiveAmount': {
      _: string;
      $: {
        currencyID: string;
      };
    };
    'cbc:PayableAmount': {
      _: string;
      $: {
        currencyID: string;
      };
    };
  };
  'cac:InvoiceLine': {
    'cbc:ID': string;
    'cbc:InvoicedQuantity': {
      _: string;
      $: {
        unitCode: string;
      };
    };
    'cbc:LineExtensionAmount': {
      _: string;
      $: {
        currencyID: string;
      };
    };
    'cac:PricingReference': {
      'cac:AlternativeConditionPrice': {
        'cbc:PriceAmount': {
          _: string;
          $: {
            currencyID: string;
          };
        };
        'cbc:PriceTypeCode': {
          $: {
            listName: string;
          };
        };
      };
    };
    'cac:TaxTotal': {
      'cbc:TaxAmount': {
        _: string;
        $: {
          currencyID: string;
        };
      };
      'cac:TaxSubtotal': {
        'cbc:TaxableAmount': {
          _: string;
          $: {
            currencyID: string;
          };
        };
        'cbc:TaxAmount': {
          _: string;
          $: {
            currencyID: string;
          };
        };
        'cac:TaxCategory': {
          'cbc:ID': {
            _: string;
            $: {
              schemeAgencyName: string;
              schemeID: string;
              schemeName: string;
            };
          };
          'cbc:Percent': string;
          'cbc:TaxExemptionReasonCode': {
            _: string;
            $: {
              listAgencyName: string;
              listName: string;
              listURI: string;
            };
          };
          'cac:TaxScheme': {
            'cbc:ID': {
              _: string;
              $: {
                schemeAgencyName: string;
                schemeID: string;
                schemeName: string;
              };
            };
            'cbc:Name': string;
            'cbc:TaxTypeCode': string;
          };
        };
      };
    };
    'cac:Item': {
      'cbc:Description': string;
      'cac:SellersItemIdentification': {
        'cbc:ID': string;
      };
    };
    'cac:Price': {
      'cbc:PriceAmount': {
        _: string;
        $: {
          currencyID: string;
        };
      };
    };
  };
  'ext:UBLExtensions': {
    'ext:UBLExtension': UBLExtension[];
  };
}
