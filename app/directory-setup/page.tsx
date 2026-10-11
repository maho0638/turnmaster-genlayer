"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus, type DecodedDeployData, type TransactionHash } from "genlayer-js/types";
import type { Address } from "viem";
import { PUBLIC_TURNMASTER_CONTRACTS } from "@/lib/public-contracts.mjs";
import { ensureBradburyNetwork, assertBradburyWallet } from "@/lib/bradbury-wallet.mjs";
import { createGenLayerWalletProvider } from "@/lib/genlayer-wallet-provider.mjs";
import { isContractAddress } from "@/lib/turnmaster-chain";

type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
const PENDING_KEY = "turnmaster-directory-setup-pending";
const SEED_ADDRESSES = [...PUBLIC_TURNMASTER_CONTRACTS] as string[];
const EXPLORER = "https://explorer-bradbury.genlayer.com";

function deployedClient(account: Address, provider: WalletProvider) {
  return createClient({ chain: testnetBradbury, account, provider: createGenLayerWalletProvider(provider) as never });
}
function getAddressFromTx(tx: Awaited<ReturnType<ReturnType<typeof deployedClient>["getTransaction"]>>) {
  const decoded = tx.txDataDecoded as DecodedDeployData | undefined;
  const address = decoded?.contractAddress ?? tx.recipient ?? tx.to_address;
  if (!address || !isContractAddress(address)) throw new Error("Confirmed deploy has no verified address; inspect its transaction.");
  return address as Address;
}
export default function DirectorySetup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Bradbury ortak iş dizini kurulumu. Yalnızca testnet GEN ağ ücreti kullanılır.");
  const [hash, setHash] = useState("");
  const [directory, setDirectory] = useState("");
  useEffect(() => { const frame = window.requestAnimationFrame(() => setHash(window.sessionStorage.getItem(PENDING_KEY) ?? "")); return () => window.cancelAnimationFrame(frame); }, []);

  const verify = async (client: ReturnType<typeof deployedClient>, transactionHash: TransactionHash) => {
    const receipt = await client.waitForTransactionReceipt({
      hash: transactionHash, status: TransactionStatus.FINALIZED, interval: 4000, retries: 45,
    });
    if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
      throw new Error("Transaction finalized but contract execution did not succeed: " + String(receipt.txExecutionResultName));
    }
    const tx = await client.getTransaction({ hash: transactionHash });
    const address = getAddressFromTx(tx);
    const rawCount = await client.readContract({ address, functionName: "get_job_count", args: [] });
    const count = Number(rawCount);
    if (!Number.isSafeInteger(count) || count < SEED_ADDRESSES.length) throw new Error("Directory did not contain the two expected jobs.");
    const rawEntries = await client.readContract({ address, functionName: "get_jobs", args: [0, SEED_ADDRESSES.length] });
    const entries = typeof rawEntries === "string" ? JSON.parse(rawEntries) as unknown : rawEntries;
    if (!Array.isArray(entries) || !SEED_ADDRESSES.every((seed) => entries.some((a) => typeof a === "string" && a.toLowerCase() === seed.toLowerCase()))) {
      throw new Error("Directory addresses could not be independently verified.");
    }
    setDirectory(address);
    window.localStorage.setItem("turnmaster-directory-deployed-address", address);
    window.sessionStorage.removeItem(PENDING_KEY);
    setHash("");
    setMessage("Başarılı! Dizin zincirde doğrulandı. Aşağıdaki kontrat adresini ChatGPT'ye gönder; Vercel canlı bağlantısını tamamlayacağım.");
  };

  const connect = async () => {
    const provider = (window as Window & { ethereum?: WalletProvider }).ethereum;
    if (!provider) throw new Error("MetaMask veya uyumlu EIP-1193 cüzdan bulunamadı.");
    const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !isContractAddress(accounts[0])) {
      throw new Error("Geçerli cüzdan adresi bulunamadı.");
    }
    await ensureBradburyNetwork(provider);
    await assertBradburyWallet(provider, accounts[0]);
    return deployedClient(accounts[0] as Address, provider);
  };

  const deploy = async () => {
    if (busy || hash) return;
    setBusy(true);
    try {
      setMessage("Cüzdan ve Bradbury ağı doğrulanıyor...");
      const client = await connect();
      const res = await fetch("/TurnMasterDirectory.py", { cache: "no-store" });
      if (!res.ok) throw new Error("Dizin kontratının kaynak dosyası yüklenemedi.");
      const source = await res.text();
      if (!source.includes("class TurnMasterDirectory") || !source.includes("def register_job")) throw new Error("Geçersiz Directory kaynak dosyası.");
      setMessage("MetaMask'ta işlem tutarını ve Bradbury ağını kontrol ederek onayla. Onay yalnızca testnet GEN gas ücreti harcar.");
      const submitted = await client.deployContract({ code: source, args: [JSON.stringify(SEED_ADDRESSES)] }) as TransactionHash;
      window.sessionStorage.setItem(PENDING_KEY, submitted);
      setHash(submitted);
      setMessage("İşlem gönderildi, kesinleşmesi bekleniyor. Yeniden deploy'a basma.");
      await verify(client, submitted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem doğrulanamadı. Explorer'dan kontrol et.");
    } finally { setBusy(false); }
  };

  const recover = async () => {
    if (!hash || busy) return;
    setBusy(true);
    try {
      const client = await connect();
      setMessage("Var olan işlem kontrol ediliyor. Yeni işlem gönderilmiyor.");
      await verify(client, hash as TransactionHash);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem henüz doğrulanamadı.");
    } finally { setBusy(false); }
  };

  return <main style={{minHeight:"100vh",background:"#06182d",color:"#eaf3ff",padding:"40px 18px",fontFamily:"Arial,sans-serif"}}>
    <section style={{maxWidth:740,margin:"0 auto",padding:28,border:"1px solid #335574",borderRadius:16}}>
      <h1>TurnMaster — Ortak İş Dizini Kurulumu</h1>
      <p>Bu sayfa site sahibinin ilk kurulum işlemi içindir. Yeni işlerin bütün ziyaretçilere görünmesini sağlayacak Bradbury Directory kontratını kurar.</p>
      <p><b>Başlangıç listesi:</b> {SEED_ADDRESSES.length} mevcut gerçek iş. Yeni oluşturulan işler daha sonra otomatik kaydedilir.</p>
      <p><b>Önemli:</b> Ağ Bradbury 4221 olmalı. Gerçek para veya özel anahtar girme. Kurulum MetaMask onayı gerektirir ve test GEN gas ücreti doğurur.</p>
      <button type="button" disabled={busy || Boolean(hash) || Boolean(directory)} onClick={() => void deploy()} style={{padding:"14px 20px",border:0,borderRadius:10,background:"#f5be4e",color:"#081b32",fontWeight:700,cursor:"pointer"}}>
        {directory ? "Dizin doğrulandı" : hash ? "Gönderilmiş işlem var" : busy ? "İşleniyor..." : "Bradbury&#39;de Directory Kur"}
      </button>
      {hash && <div style={{marginTop:20}}>
        <p>İşlem kimliği: <code style={{overflowWrap:"anywhere"}}>{hash}</code></p>
        <p><a href={EXPLORER + "/tx/" + hash} target="_blank" rel="noreferrer" style={{color:"#8fdcff"}}>Explorer&#39;da işlemi kontrol et</a></p>
        <button type="button" disabled={busy} onClick={() => void recover()} style={{padding:"12px",borderRadius:8}}>Gönderilmiş işlemi doğrula (yeni işlem yok)</button>
      </div>}
      <p role="status" style={{marginTop:20,lineHeight:1.55}}>{message}</p>
      {directory && <aside style={{marginTop:20,padding:16,border:"1px solid #2bc9a9",borderRadius:10}}>
        <p><b>Onaylanmış Directory kontrat adresi:</b></p>
        <code style={{overflowWrap:"anywhere"}}>{directory}</code>
        <p><button type="button" onClick={() => navigator.clipboard.writeText(directory)}>Adresi kopyala</button></p>
      </aside>}
      <p><Link href="/" style={{color:"#8fdcff"}}>İş panosuna dön</Link></p>
    </section>
  </main>;
}
