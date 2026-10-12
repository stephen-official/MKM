import { ArrowRight, History, LogOut, School, UserRound, Warehouse } from "lucide-react";
import { createElement } from "react";
import "./KitchenMore.css";

function MoreAction({ icon: Icon, title, description, onClick, danger = false }) {
  return <button type="button" className={`km-action${danger ? " km-action--danger" : ""}`} onClick={onClick}><span className="km-action__icon">{createElement(Icon, { size: 21 })}</span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight className="km-action__arrow" size={19} /></button>;
}

export default function KitchenMore({ userInfo, onActivity, onTransfers, onLogout }) {
  const name = userInfo?.name || "Kitchen staff";
  const kitchen = userInfo?.godown?.name || "Kitchen";
  return <main className="km-shell">
    <header className="km-heading"><p>Kitchen account</p><h1>More</h1><span>Records, transfers and account details.</span></header>
    <section className="km-profile" aria-label="Signed-in account"><span className="km-profile__avatar"><UserRound size={25} /></span><div><p>Signed in as</p><h2>{name}</h2><span><School size={14} /> {kitchen}</span></div></section>
    <section aria-labelledby="km-tools-title"><div className="km-section-title"><p>Kitchen tools</p><h2 id="km-tools-title">Records and movement</h2></div><div className="km-actions"><MoreAction icon={History} title="Usage activity" description="Review previously recorded kitchen usage" onClick={onActivity} /><MoreAction icon={Warehouse} title="Stock transfers" description="Send stock or respond to incoming transfers" onClick={onTransfers} /></div></section>
    <section aria-labelledby="km-account-title"><div className="km-section-title"><p>Account</p><h2 id="km-account-title">Session</h2></div><div className="km-actions"><MoreAction icon={LogOut} title="Log out" description="Sign out of this kitchen account" onClick={onLogout} danger /></div></section>
  </main>;
}
