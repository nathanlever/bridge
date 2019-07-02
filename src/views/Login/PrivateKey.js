import React, { useEffect } from 'react';
import Maybe from 'folktale/maybe';
import { Grid, Input } from 'indigo-react';

import { useHexInput } from 'components/Inputs';

import { useWallet } from 'store/wallet';

import { EthereumWallet, WALLET_TYPES, stripHexPrefix } from 'lib/wallet';
import useLoginView from 'lib/useLoginView';

export default function PrivateKey({ className }) {
  useLoginView(WALLET_TYPES.PRIVATE_KEY);

  const { setWallet } = useWallet();

  const privateKeyInput = useHexInput({
    length: 64,
    name: 'privateKey',
    label: 'Private key',
    autoFocus: true,
  });
  const { pass, data: privateKey } = privateKeyInput;

  useEffect(() => {
    if (pass) {
      const sec = Buffer.from(stripHexPrefix(privateKey), 'hex');
      const newWallet = new EthereumWallet(sec);
      setWallet(Maybe.Just(newWallet));
    } else {
      setWallet(Maybe.Nothing());
    }
  }, [pass, privateKey, setWallet]);

  return (
    <Grid className={className}>
      <Grid.Item full as={Input} {...privateKeyInput} />
    </Grid>
  );
}
