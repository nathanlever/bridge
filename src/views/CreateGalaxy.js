import React, { useCallback, useEffect, useState } from 'react';
import { Nothing, Just } from 'folktale/maybe';
import cn from 'classnames';
import { Grid, Text, Input } from 'indigo-react';
import * as azimuth from 'azimuth-js';

import { useNetwork } from 'store/network';
import { useHistory } from 'store/history';
import { usePointCache } from 'store/pointCache';

import * as need from 'lib/need';
import { useAddressInput, useGalaxyInput } from 'lib/useInputs';
import useEthereumTransaction from 'lib/useEthereumTransaction';
import { GAS_LIMITS } from 'lib/constants';
import patp2dec from 'lib/patp2dec';

import ViewHeader from 'components/ViewHeader';
import MiniBackButton from 'components/MiniBackButton';
import InlineEthereumTransaction from 'components/InlineEthereumTransaction';
import View from 'components/View';
import { isZeroAddress } from 'lib/wallet';

function useCreateGalaxy() {
  const { contracts } = useNetwork();
  const { syncKnownPoint } = usePointCache();

  const _contracts = need.contracts(contracts);

  const [galaxy, setGalaxy] = useState();

  const {
    construct: _construct,
    unconstruct,
    confirmed,
    inputsLocked,
    bind,
  } = useEthereumTransaction(GAS_LIMITS.DEFAULT);

  const construct = useCallback(
    (galaxy, owner) => {
      setGalaxy(galaxy);
      _construct(azimuth.ecliptic.createGalaxy(_contracts, galaxy, owner));
    },
    [_construct, _contracts]
  );

  useEffect(() => {
    if (confirmed) {
      syncKnownPoint(galaxy);
    }
  }, [confirmed, galaxy, syncKnownPoint]);

  return {
    construct,
    unconstruct,
    confirmed,
    inputsLocked,
    bind,
  };
}

export default function CreateGalaxy() {
  const { pop } = useHistory();
  const { contracts } = useNetwork();
  const _contracts = need.contracts(contracts);

  const [error, setError] = useState();
  const [isAvailable, setIsAvailable] = useState(Nothing());

  const {
    construct,
    unconstruct,
    confirmed,
    inputsLocked,
    bind,
  } = useCreateGalaxy();

  const [
    galaxyNameInput,
    { pass: validGalaxyName, syncPass: syncValidGalaxyName, value: galaxyName },
    // ^ we use value: here so our effect runs onChange
  ] = useGalaxyInput({
    disabled: inputsLocked,
    autoFocus: true,
    error:
      error ||
      isAvailable.matchWith({
        Nothing: () => 'Loading availabiliy...', // TODO: make async loading?
        Just: p => (p.value ? undefined : 'This galaxy is already owned.'),
      }),
  });

  const [ownerInput, { pass: validOwner, data: owner }] = useAddressInput({
    name: 'owner',
    label: `Ethereum Address`,
    disabled: inputsLocked,
  });

  useEffect(() => {
    if (validGalaxyName && validOwner) {
      construct(patp2dec(galaxyName), owner);
    } else {
      unconstruct();
    }
  }, [owner, construct, unconstruct, validGalaxyName, validOwner, galaxyName]);

  useEffect(() => {
    if (!syncValidGalaxyName || inputsLocked) {
      return;
    }

    setError();
    setIsAvailable(Nothing());

    let cancelled = false;

    (async () => {
      try {
        const currentOwner = await azimuth.azimuth.getOwner(
          _contracts,
          patp2dec(galaxyName)
        );

        const isAvailable = isZeroAddress(currentOwner);

        if (cancelled) {
          return;
        }

        setIsAvailable(Just(isAvailable));
      } catch (error) {
        console.error(error);
        setError(error.message);
        setIsAvailable(Just(false));
      }
    })();

    return () => (cancelled = true);
  }, [
    _contracts,
    galaxyName,
    inputsLocked,
    setIsAvailable,
    syncValidGalaxyName,
  ]);

  return (
    <View inset>
      <Grid>
        <Grid.Item full as={MiniBackButton} onClick={() => pop()} />

        <Grid.Item full as={ViewHeader}>
          Create a Galaxy
        </Grid.Item>

        {confirmed && (
          <Grid.Item
            full
            as={Text}
            className={cn('f5', {
              green3: confirmed,
            })}>
            {galaxyName} has been created and is owned by {owner}.
          </Grid.Item>
        )}

        <Grid.Item full as={Input} {...galaxyNameInput} className="mt4" />
        <Grid.Item full as={Input} {...ownerInput} className="mb4" />

        <Grid.Item
          full
          as={InlineEthereumTransaction}
          {...bind}
          onReturn={() => pop()}
        />
      </Grid>
    </View>
  );
}
