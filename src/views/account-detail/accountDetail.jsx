import React, { useCallback, useEffect, useState } from "react";
import { Button, Link } from "@pokt-foundation/ui";
import { useHistory } from "react-router";
import AccountHeaderContainer from "../../components/account-detail/headerContainer";
import Layout from "../../components/layout";
import AccountContent from "../../components/account-detail/content";
import CopyButton from "../../components/copy/copy";
import { Config } from "../../config/config";
import { getDataSource } from "../../datasource";
import loadIcon from "../../utils/images/icons/load.svg";
import sentReceivedIcon from "../../utils/images/icons/sentReceived.svg";
import StakingOption from "../../components/account-detail/stakingOption";
import RevealPrivateKey from "../../components/modals/private-key/revealPrivateKey";
import UnjailUnstake from "../../components/modals/unjail-unstake/unjailUnstake";
import AnimatedLogo from "../../components/animated-logo/animatedLogo";
import { useUser } from "../../context/userContext";
import TransactionsTable from "../../components/transactionsTable/transactionsTable";
import ExportKeyfile from "../../components/modals/export-keyfile/exportKeyfile";
import socketIOClient from "socket.io-client";
const ENDPOINT = "http://127.0.0.1:4001";

const dataSource = getDataSource();

export default function AccountDetail() {
  const history = useHistory();
  const { user } = useUser();
  const { addressHex, ppk, publicKeyHex } = user;
  const [poktsBalance, setPoktsBalance] = useState(0);
  const [, setUsdBalance] = useState(0);
  const [appStakedTokens, setAppStakedTokens] = useState(0);
  const [nodeStakedTokens, setNodeStakedTokens] = useState(0);
  const [appStakingStatus, setAppStakingStatus] = useState("UNSTAKED");
  const [nodeStakingStatus, setNodeStakingStatus] = useState("UNSTAKED");
  const [isPkRevealModalVisible, setIsPkRevealModalVisible] = useState(false);
  const [isUnjailModalVisible, setIsUnjailModalVisible] = useState(false);
  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [maxTxListCount, setMaxTxListCount] = useState(
    Number(Config.MIN_TRANSACTION_LIST_COUNT)
  );
  const [txList, setTxList] = useState([]);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [priceProvider, setPriceProvider] = useState("");
  const [priceProviderLink, setPriceProviderLink] = useState("");
  const [isExportKeyfileVisible, setIsExportKeyfileVisible] = useState(false);
  const [socket, setSocket] =useState(null);

  const increaseMaxTxListCount = useCallback(() => {
    if (maxTxListCount < Number(Config.MAX_TRANSACTION_LIST_COUNT)) {
      setMaxTxListCount((prevMax) => prevMax + 50);
    }
  }, [maxTxListCount]);

  const pushToTxDetail = useCallback(
    (txHash, useCache) => {
      if (!addressHex || !publicKeyHex || !ppk) {
        console.error(
          "No account available, please create or import an account"
        );
        return;
      }

      if (txHash) {
        history.push({
          pathname: "/transaction-detail",
          data: { txHash },
          loadFromCache: useCache,
        });
      }
    },
    [history, addressHex, publicKeyHex, ppk]
  );

  const pushToSend = useCallback(() => {
    if (!addressHex || !publicKeyHex || !ppk) {
      console.error("No account available, please create an account");
      return;
    }

    history.push({
      pathname: "/send",
    });
  }, [history, addressHex, publicKeyHex, ppk]);

  const getTransactionData = useCallback((stdTx) => {
    if (stdTx.msg.type === "pos/MsgUnjail") {
      return { type: "unjail", amount: 0 };
    } else if (stdTx.msg.type === "pos/MsgBeginUnstake") {
      return { type: "unstake", amount: 0 };
    } else if (stdTx.msg.type === "pos/MsgStake") {
      const value = stdTx.msg.value.value / 1000000;
      return { type: "stake", amount: value };
    } else if (stdTx.msg.type === "pos/Send") {
      const amount = stdTx.msg.value.amount / 1000000;
      return { type: "sent", amount: amount };
    } else {
      const sendAmount = Object.keys(stdTx.msg).includes("amount")
        ? stdTx.msg.amount / 1000000
        : stdTx.msg.value.amount / 1000000;
      return { type: "sent", amount: sendAmount };
    }
  }, []);

  useEffect(() => {
    const socket = socketIOClient(ENDPOINT);
    setSocket(socket);
    socket.on("chat message", data => {
      if (data?.amount) {
        const { 
          amount = Number(data?.amount),
          memo = '',
          reciever = ''
        } = data;

        console.log(data, 'datatata')

        history.push({
          pathname: "/send", state : { amount, reciever, memo }
        });
      }
    });
  }, []);

  const updateTransactionList = useCallback(
    (txs) => {
      try {
        const rTxs = txs.reverse();
        const sentImgSrc = sentReceivedIcon;
        const loadingImgSrc = loadIcon;

        const renderTxs = (tx) => {
          if (!tx.stdTx.msg.amount && !tx.stdTx.msg.value) {
            return;
          }

          const { type: transactionType, amount } = getTransactionData(
            tx.stdTx
          );

          return {
            hash: tx.hash,
            imageSrc:
              transactionType.toLowerCase() === "sent"
                ? sentImgSrc
                : loadingImgSrc,
            amount: amount ? amount : 0,
            type: tx.type === "Received" ? tx.type : transactionType,
            height: tx.height,
            options: {
              onClick: () => pushToTxDetail(tx.hash, false),
            },
          };
        };
        const renderedTxs = rTxs.map(renderTxs).filter((i) => i);
        setTxList(renderedTxs);
      } catch (error) {
        console.log(error);
      }
    },
    [getTransactionData, pushToTxDetail]
  );

  const getTransactions = useCallback(async () => {
    const allTxs = await dataSource.getAllTransactions(addressHex);

    if (allTxs !== undefined) {
      updateTransactionList(allTxs);
    }
  }, [addressHex, updateTransactionList]);

  const getBalance = useCallback(async (addressHex) => {
    if (addressHex) {
      const balance = await dataSource.getBalance(addressHex);
      const poktBalance = balance.toFixed(2);
      const usdBalance = (balance * Number(Config.POKT_USD_VALUE)).toFixed(2);

      setPoktsBalance(poktBalance);
      setUsdBalance(usdBalance);
    }
  }, []);

  const getPrice = useCallback(async () => {
    const priceData = await dataSource.getPrice();
    setPrice(priceData.price);
    setPriceProvider(priceData.priceSourceText);
    setPriceProviderLink(priceData.priceSourceURL);
  }, []);

  const addNode = useCallback((node) => {
    let obj = {
      stakingStatus: "UNSTAKED",
      stakedTokens: 0,
    };

    if (node === undefined) {
      setNodeStakedTokens(obj.stakedTokens);
      setNodeStakingStatus(obj.stakingStatus);
      return;
    }

    const isUnjailing = localStorage.getItem("unjailing");

    if (node?.tokens) {
      obj.stakedTokens = (Number(node.tokens.toString()) / 1000000).toFixed(3);
    }

    if (node?.status === 1) {
      obj.stakingStatus = "UNSTAKING";
    } else if (node?.status === 2) {
      obj.stakingStatus = "STAKED";
    }

    if (node?.jailed) {
      if (isUnjailing) {
        obj.stakingStatus = "UNJAILING";
      } else {
        obj.stakingStatus = "JAILED";
      }
    } else {
      localStorage.setItem("unjailing", false);
    }

    setNodeStakedTokens(obj.stakedTokens);
    setNodeStakingStatus(obj.stakingStatus);
  }, []);

  const addApp = useCallback((app) => {
    let obj = {
      stakingStatus: "UNSTAKED",
      stakedTokens: 0,
    };

    if (app === undefined) {
      setAppStakedTokens(obj.stakedTokens);
      setAppStakingStatus(obj.stakingStatus);
      return;
    }

    // Update the staked amount
    if (app?.staked_tokens) {
      obj.stakedTokens = (
        Number(app.staked_tokens.toString()) / 1000000
      ).toFixed(3);
    }

    if (app?.status === 1) {
      obj.stakingStatus = "UNSTAKING";
    } else if (app.status === 2) {
      obj.stakingStatus = "STAKED";
    }

    setAppStakedTokens(obj.stakedTokens);
    setAppStakingStatus(obj.stakingStatus);
  }, []);

  const getAccountType = useCallback(
    async (addressHex) => {
      const appOrError = await dataSource.getApp(addressHex);

      if (appOrError !== undefined) {
        addApp(appOrError);
      }

      const nodeOrError = await dataSource.getNode(addressHex);

      if (nodeOrError !== undefined) {
        addNode(nodeOrError);
      }
    },
    [addApp, addNode]
  );

  const refreshView = useCallback(
    (addressHex, loadMore = false) => {
      getBalance(addressHex);
      getPrice();
      getAccountType(addressHex);

      if (loadMore) {
        increaseMaxTxListCount();
      }
      getTransactions(addressHex, maxTxListCount);
    },
    [
      getAccountType,
      getBalance,
      getPrice,
      getTransactions,
      increaseMaxTxListCount,
      maxTxListCount,
    ]
  );

  useEffect(() => {
    setLoading(true);
    if (addressHex && publicKeyHex && ppk) {
      refreshView(addressHex);
    } else {
      localStorage.clear();
      history.push({
        pathname: "/",
      });
    }
  }, [refreshView, history, addressHex, publicKeyHex, ppk]);

  useEffect(() => {
    if (poktsBalance && txList && publicKeyHex && addressHex) {
      setLoading(false);
    }
  }, [poktsBalance, txList, publicKeyHex, addressHex]);

  if (!addressHex || !publicKeyHex) {
    localStorage.clear();
    history.push({
      pathname: "/",
    });
  }

  if (loading) return <AnimatedLogo />;

  return (
    <Layout
      title={
        <AccountHeaderContainer>
          <h1>
            {Number(poktsBalance).toLocaleString("en-US", {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}{" "}
            POKT
          </h1>
          {price && (
            <h2>
              $
              {parseFloat(price * poktsBalance).toLocaleString("en-US", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}{" "}
              USD{" "}
              {process.env.REACT_APP_CHAIN_ID !== "testnet" ? (
                <Link href={priceProviderLink}>Price by {priceProvider}</Link>
              ) : (
                <p>Testing tokens</p>
              )}
            </h2>
          )}
        </AccountHeaderContainer>
      }
    >
      <AccountContent isStaked={nodeStakingStatus === "STAKED"}>
        {nodeStakingStatus === "JAILED" ? (
          <section className="unjail-container">
            <div className="unjail-description">
              <h2>Jailed Node</h2>
              <p>Currently not dispaching Data</p>
            </div>
            <Button
              className="unjail-button"
              onClick={() => setIsUnjailModalVisible(true)}
            >
              Unjail
            </Button>
          </section>
        ) : null}

        {nodeStakingStatus === "UNSTAKED" && appStakingStatus === "UNSTAKED" ? (
          <StakingOption
            className="none-options"
            token="00.00"
            status="Unstaked"
            accountType="None"
          />
        ) : (
          <>
            {nodeStakingStatus !== "UNSTAKED" ? (
              <StakingOption
                className="node-options"
                token={nodeStakedTokens}
                status={nodeStakingStatus}
                accountType="Node"
              />
            ) : null}

            {nodeStakingStatus !== "UNSTAKED" &&
            appStakingStatus !== "UNSTAKED" ? (
              <div className="separator"></div>
            ) : null}

            {appStakingStatus !== "UNSTAKED" ? (
              <StakingOption
                className="app-options"
                token={appStakedTokens}
                status={appStakingStatus}
                accountType="App"
              />
            ) : null}
          </>
        )}

        <section className="unstake-send-container">
          {nodeStakingStatus === "STAKED" ? (
            <Button
              className="unstake-button"
              onClick={() => setIsUnstakeModalVisible(true)}
            >
              Unstake
            </Button>
          ) : null}

          <Button mode="primary" className="send-button" onClick={pushToSend}>
            Send
          </Button>
        </section>

        <h3 className="copy-title">Address</h3>

        <CopyButton text={addressHex} width={488} />

        <h3 className="copy-title">Public Key</h3>

        <CopyButton text={publicKeyHex} width={488} />

        <section className="actions">
          <Button
            className="reveal-private-key"
            onClick={() => setIsPkRevealModalVisible(true)}
          >
            Reveal Private Key
          </Button>

          <Button
            className="export-keyfile"
            onClick={() => setIsExportKeyfileVisible(true)}
          >
            Export Keyfile
          </Button>
        </section>

        <TransactionsTable txList={txList} />

        <RevealPrivateKey
          ppk={ppk}
          visible={isPkRevealModalVisible}
          onClose={() => setIsPkRevealModalVisible(false)}
        />

        <ExportKeyfile
          visible={isExportKeyfileVisible}
          onClose={() => setIsExportKeyfileVisible(false)}
        />

        <UnjailUnstake
          type="unjail"
          ppk={ppk}
          visible={isUnjailModalVisible}
          onClose={() => setIsUnjailModalVisible(false)}
          pushToTxDetail={pushToTxDetail}
          nodeAddress={addressHex}
        />

        <UnjailUnstake
          type="unstake"
          ppk={ppk}
          visible={isUnstakeModalVisible}
          onClose={() => setIsUnstakeModalVisible(false)}
          pushToTxDetail={pushToTxDetail}
          nodeAddress={addressHex}
        />
      </AccountContent>
    </Layout>
  );
}
