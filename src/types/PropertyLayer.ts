export type PropertyLayer = {
  version: '0.0.0';
  name: 'sky_trade_land_token_program';
  instructions: [
    {
      name: 'initialize';
      accounts: [
        {
          name: 'feePayer';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'dataAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'merkleTree';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [];
    },
    {
      name: 'mintToken';
      accounts: [
        {
          name: 'feePayer';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'dataAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'merkleTree';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'recipient';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'treeConfig';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bubblegumProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'logWrapper';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'compressionProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'collectionMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'collectionMetadata';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'collectionEdition';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bubblegumSigner';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenMetadataProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'metadataArgs';
          type: 'bytes';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'data';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'initialized';
            type: 'bool';
          },
          {
            name: 'authorityAccount';
            type: 'publicKey';
          },
          {
            name: 'merkleTreeAddress';
            type: 'publicKey';
          },
        ];
      };
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'AlreadyInitialized';
      msg: 'Program already initialized!';
    },
    {
      code: 6001;
      name: 'InvalidAuthority';
      msg: 'Invalid authority provided!';
    },
    {
      code: 6002;
      name: 'InvalidTreeAddressPassed';
      msg: 'Provided Tree Address is invalid';
    },
  ];
};

export const IDL: PropertyLayer = {
  version: '0.0.0',
  name: 'sky_trade_land_token_program',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        {
          name: 'feePayer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'dataAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'merkleTree',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'mintToken',
      accounts: [
        {
          name: 'feePayer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'dataAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'merkleTree',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'recipient',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'treeConfig',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bubblegumProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'logWrapper',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'compressionProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'collectionMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'collectionMetadata',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'collectionEdition',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bubblegumSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenMetadataProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'metadataArgs',
          type: 'bytes',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'data',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'initialized',
            type: 'bool',
          },
          {
            name: 'authorityAccount',
            type: 'publicKey',
          },
          {
            name: 'merkleTreeAddress',
            type: 'publicKey',
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'AlreadyInitialized',
      msg: 'Program already initialized!',
    },
    {
      code: 6001,
      name: 'InvalidAuthority',
      msg: 'Invalid authority provided!',
    },
    {
      code: 6002,
      name: 'InvalidTreeAddressPassed',
      msg: 'Provided Tree Address is invalid',
    },
  ],
};
