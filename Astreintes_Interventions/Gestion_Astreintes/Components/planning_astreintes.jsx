const Component = () => {
  const [astreintes, setAstreintes] = useState([]);
  const [services, setServices] = useState([]);
  const [personnels, setPersonnels] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [joursSemaine, setJoursSemaine] = useState([]);
  const [joursFeries, setJoursFeries] = useState([]);
  const [servicesCliniques, setServicesCliniques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('mois');
  const [selectedServiceClinique, setSelectedServiceClinique] = useState('tous');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    service: '', clinicienJour: '', clinicienNuit: '', date: '',
    jour: false, nuit: false, jourValidated: false, nuitValidated: false
  });
  const [copiedWeek, setCopiedWeek] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [astreintesData, servicesData, personnelsData, utilisateursData,
             joursSemaineData, joursFeriesData, servicesCliniquesData] = await Promise.all([
        gristAPI.getData('Astreintes'),
        gristAPI.getData('TypesAstreintes'),
        gristAPI.getData('Personnels'),
        gristAPI.getData('Utilisateurs'),
        gristAPI.getData('JoursSemaine'),
        gristAPI.getData('JoursFeries'),
        gristAPI.getData('ServicesCliniques')
      ]);
      const astr = Array.isArray(astreintesData) ? astreintesData : [];
      const svcs = Array.isArray(servicesData) ? servicesData : [];
      const pers = Array.isArray(personnelsData) ? personnelsData : [];
      const util = Array.isArray(utilisateursData) ? utilisateursData : [];
      const js   = Array.isArray(joursSemaineData) ? joursSemaineData : [];
      const jf   = Array.isArray(joursFeriesData) ? joursFeriesData : [];
      const sc   = Array.isArray(servicesCliniquesData) ? servicesCliniquesData : [];
      setAstreintes(astr); setServices(svcs); setPersonnels(pers); setUtilisateurs(util);
      setJoursSemaine(js); setJoursFeries(jf); setServicesCliniques(sc);

      // Auto-sélection service clinique si l'utilisateur n'en a qu'un
      if (util.length > 0) {
        const u = util[0];
        const scVal = u.ServiceClinique;
        // ServiceClinique peut être une RefList ["L","Anesthésie"] ou une string ou vide
        let scNoms = [];
        if (Array.isArray(scVal) && scVal[0] === 'L') {
          scNoms = scVal.slice(1).filter(Boolean);
        } else if (typeof scVal === 'string' && scVal.trim() !== '') {
          scNoms = [scVal.trim()];
        }
        if (scNoms.length === 1) setSelectedServiceClinique(scNoms[0]);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally { setLoading(false); }
  };

  // ── Utilitaires dates ───────────────────────────────────────────────────────
  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  const dateToTimestamp = (s) => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return Math.floor(new Date(y, m - 1, d, 12, 0, 0).getTime() / 1000);
  };
  const sameDay = (date, timestamp) => {
    const a = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const b = new Date(timestamp * 1000);
    const bn = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12, 0, 0);
    return Math.abs(a - bn) / 86400000 < 1;
  };

  const isJourFerie = (date) =>
    joursFeries.some(jf => sameDay(date, jf.JourFerie));

  const getJourSemaine = (date) => {
    const rang = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return joursSemaine.find(js => js.Rang === rang) || null;
  };

  const isSamediOuvert = (serviceId) => {
    const svc = services.find(s => s.id === parseInt(serviceId));
    if (!svc) return false;
    const sc = servicesCliniques.find(sc => sc.id === svc.ServiceClinique);
    return sc && sc.Samedi === 'Ouvert';
  };

  const shouldDisableJour = (date, serviceId) => {
    if (!date) return false;
    const js = getJourSemaine(date);
    const ferie = isJourFerie(date);
    if (js && js.Type === 'Ouvert' && !ferie) return true;
    if (js && js.Jour === 'Samedi' && !ferie && isSamediOuvert(serviceId)) return true;
    return false;
  };

  const getDisabledJourMsg = (date, serviceId) => {
    if (!date) return '';
    const js = getJourSemaine(date);
    const ferie = isJourFerie(date);
    if (!js) return '';
    if (js.Type === 'Ouvert' && !ferie) return "Pas d'astreinte en journée : jour ouvert non férié";
    if (js.Jour === 'Samedi' && !ferie && isSamediOuvert(serviceId)) return "Pas d'astreinte en journée : samedi ouvert non férié";
    if (ferie) return "Astreinte en journée : jour férié";
    return '';
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigatePrevious = () => {
    const d = new Date(currentDate);
    if (viewMode === 'année') d.setFullYear(d.getFullYear() - 1);
    else if (viewMode === 'mois') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'année') d.setFullYear(d.getFullYear() + 1);
    else if (viewMode === 'mois') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  const goToToday = () => setCurrentDate(new Date());

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    return d;
  };

  // ── Filtres ─────────────────────────────────────────────────────────────────
  const isResponsable = () => utilisateurs.length > 0 && utilisateurs[0].Responsable === true;

  // Services cliniques autorisés pour l'utilisateur courant (textes)
  // { portee: 'aucun' | 'liste' | 'tous', noms: [...] }
  // Défaut = 'aucun'. 'tous' n'est accordé qu'à un responsable explicite.
  const getPerimetreUtilisateur = () => {
    if (utilisateurs.length === 0) return { portee: 'aucun', noms: [] };
    const u = utilisateurs[0];
    const scVal = u.ServiceClinique;
    let noms = [];
    if (Array.isArray(scVal) && scVal[0] === 'L') noms = scVal.slice(1).filter(Boolean);
    else if (typeof scVal === 'string' && scVal.trim() !== '') noms = [scVal.trim()];
    if (noms.length > 0) return { portee: 'liste', noms };
    return u.Responsable === true ? { portee: 'tous', noms: [] } : { portee: 'aucun', noms: [] };
  };

  // Types d'astreinte autorisés pour l'utilisateur courant
  const getServicesAutorises = () => {
    const p = getPerimetreUtilisateur();
    if (p.portee === 'aucun') return [];
    if (p.portee === 'tous')  return services;
    return services.filter(s => {
      const sc = servicesCliniques.find(sc => sc.id === s.ServiceClinique);
      return sc && p.noms.includes(sc.NomService);
    });
  };

  // NomService résolu d'un TypeAstreinte
  const getServiceCliniqueNom = (svc) => {
    if (!svc) return '';
    const sc = servicesCliniques.find(sc => sc.id === svc.ServiceClinique);
    return sc ? sc.NomService : '';
  };

  // Liste des NomService distincts (pour le filtre dropdown)
  const getServicesCliniquesNoms = () => {
    const svcsAuto = getServicesAutorises();
    return [...new Set(svcsAuto.map(s => getServiceCliniqueNom(s)).filter(Boolean))].sort();
  };

  const getAstreintesForDate = (date) =>
    astreintes.filter(a => sameDay(date, a.Date));

  const filterBySC = (list) => {
    if (selectedServiceClinique === 'tous') return list;
    // astreinte.ServiceClinique est un texte calculé = NomService du TypeAstreinte
    return list.filter(a => a.ServiceClinique === selectedServiceClinique);
  };

  const filterByPeriod = (list) => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    if (viewMode === 'année') return list.filter(a => new Date(a.Date * 1000).getFullYear() === y);
    if (viewMode === 'mois')  return list.filter(a => { const d = new Date(a.Date * 1000); return d.getFullYear() === y && d.getMonth() === m; });
    const sw = getStartOfWeek(currentDate), ew = new Date(sw); ew.setDate(ew.getDate() + 7);
    return list.filter(a => { const d = new Date(a.Date * 1000); return d >= sw && d <= ew; });
  };

  // Filtre astreintes selon services autorisés de l'utilisateur
  const filterByUser = (list) => {
    const p = getPerimetreUtilisateur();
    if (p.portee === 'aucun') return [];
    if (p.portee === 'tous')  return list;
    return list.filter(a => p.noms.includes(a.ServiceClinique));
  };

  const getAstreintesView = () => filterBySC(filterByPeriod(filterByUser(astreintes)));

  // ── Noms ────────────────────────────────────────────────────────────────────
  const getServiceName = (typeAstreinteId) => {
    const s = services.find(s => s.id === typeAstreinteId);
    return s ? s.TypeAstreinte : 'Service inconnu';
  };
  const getClinicienName = (id) => {
    if (!id || id === 0) return '';
    const p = personnels.find(p => p.id === id);
    return p ? p.Clinicien : 'Inconnu';
  };

  // Cliniciens éligibles pour un TypeAstreinte (via la RefList Cliniciens du TypeAstreinte)
  const getCliniciensByService = (serviceId) => {
    if (!serviceId) return [];
    const svc = services.find(s => s.id === parseInt(serviceId));
    if (!svc || !svc.Cliniciens) return personnels.filter(p => p.ServiceClinique === svc.ServiceClinique);
    // svc.Cliniciens est une RefList ["L", id1, id2, ...]
    const ids = Array.isArray(svc.Cliniciens) && svc.Cliniciens[0] === 'L'
      ? svc.Cliniciens.slice(1) : [];
    return personnels.filter(p => ids.includes(p.id));
  };

  const isJour = (a) => a.Type === '☀️ Jour';
  const isNuit = (a) => a.Type === '🌙 Nuit';

  // ── Modal ───────────────────────────────────────────────────────────────────
  const loadExistingAstreintes = (date, serviceId) => {
    const empty = { clinicienJour: '', clinicienNuit: '', jour: false, nuit: false, jourValidated: false, nuitValidated: false };
    if (!serviceId) return empty;
    const dayA = getAstreintesForDate(date).filter(a => a.TypeAstreinte === parseInt(serviceId));
    const j = dayA.find(a => isJour(a));
    const n = dayA.find(a => isNuit(a));
    return {
      clinicienJour: j ? j.Clinicien.toString() : '',
      clinicienNuit: n ? n.Clinicien.toString() : '',
      jour: !!j, nuit: !!n,
      jourValidated: j ? j.En_Suivi === true : false,
      nuitValidated: n ? n.En_Suivi === true : false
    };
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const svcsAuto = getServicesAutorises();
    const initSvc = svcsAuto.length === 1 ? svcsAuto[0].id : '';
    const existing = loadExistingAstreintes(date, initSvc);
    const y = date.getFullYear(), mo = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
    setFormData({ service: initSvc, date: `${y}-${mo}-${d}`, ...existing });
    setShowAddModal(true);
  };

  const handleServiceChange = (newId) => {
    setFormData(prev => ({ ...prev, service: newId, ...loadExistingAstreintes(selectedDate, newId) }));
  };

  const handleSaveAstreinte = async () => {
    if (!formData.service || (!formData.clinicienJour && !formData.clinicienNuit)) {
      alert('Veuillez sélectionner au moins un service et un clinicien'); return;
    }
    try {
      const ts = dateToTimestamp(formData.date);
      const dayA = getAstreintesForDate(selectedDate).filter(a => a.TypeAstreinte === parseInt(formData.service));
      const existJ = dayA.find(a => isJour(a));
      const existN = dayA.find(a => isNuit(a));

      if (formData.jour && formData.clinicienJour) {
        if (existJ) await gristAPI.updateRecord('Astreintes', existJ.id, { Clinicien: parseInt(formData.clinicienJour) });
        else await gristAPI.addRecord('Astreintes', { TypeAstreinte: parseInt(formData.service), Clinicien: parseInt(formData.clinicienJour), Date: ts, Type: '☀️ Jour' });
      } else if (existJ) await gristAPI.deleteRecord('Astreintes', existJ.id);

      if (formData.nuit && formData.clinicienNuit) {
        if (existN) await gristAPI.updateRecord('Astreintes', existN.id, { Clinicien: parseInt(formData.clinicienNuit) });
        else await gristAPI.addRecord('Astreintes', { TypeAstreinte: parseInt(formData.service), Clinicien: parseInt(formData.clinicienNuit), Date: ts, Type: '🌙 Nuit' });
      } else if (existN) await gristAPI.deleteRecord('Astreintes', existN.id);

      setShowAddModal(false);
      setFormData({ service: '', clinicienJour: '', clinicienNuit: '', date: '', jour: false, nuit: false, jourValidated: false, nuitValidated: false });
      await loadData();
    } catch (e) { alert('Erreur sauvegarde: ' + e.message); }
  };

  const handleDeleteAstreinte = async (a) => {
    if (confirm('Supprimer cette astreinte ?')) {
      try { await gristAPI.deleteRecord('Astreintes', a.id); await loadData(); }
      catch (e) { alert('Erreur suppression: ' + e.message); }
    }
  };

  // ── Copier/coller semaine ───────────────────────────────────────────────────
  const handleCopyWeek = () => {
    const sw = getStartOfWeek(currentDate);
    const svcsAutoIds = getServicesAutorises().map(s => s.id);
    const weekData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sw); day.setDate(day.getDate() + i);
      filterBySC(getAstreintesForDate(day))
        .filter(a => svcsAutoIds.includes(a.TypeAstreinte))
        .forEach(a => weekData.push({ dayOffset: i, service: a.TypeAstreinte, clinicien: a.Clinicien, type: a.Type }));
    }
    const ew = new Date(sw); ew.setDate(ew.getDate() + 6);
    setCopiedWeek({ data: weekData, startDate: new Date(sw), endDate: ew });
  };

  const handlePasteWeek = async () => {
    if (!copiedWeek?.data?.length) { alert("Aucune semaine copiée."); return; }
    const sw = getStartOfWeek(currentDate);
    let ok = 0, ko = 0;
    for (const ca of copiedWeek.data) {
      try {
        const day = new Date(sw); day.setDate(day.getDate() + ca.dayOffset);
        const ts = Math.floor(day.getTime() / 1000);
        const existing = getAstreintesForDate(day).find(a => a.TypeAstreinte === ca.service && a.Type === ca.type);
        if (existing) {
          if (existing.En_Suivi) continue;
          await gristAPI.updateRecord('Astreintes', existing.id, { Clinicien: ca.clinicien });
        } else {
          await gristAPI.addRecord('Astreintes', { TypeAstreinte: ca.service, Clinicien: ca.clinicien, Date: ts, Type: ca.type });
        }
        ok++;
      } catch (e) { ko++; }
    }
    await loadData();
    if (ko > 0) alert(`${ok} astreinte(s) collée(s), ${ko} erreur(s).`);
  };

  // ── Titre période ───────────────────────────────────────────────────────────
  const getCurrentViewTitle = () => {
    if (viewMode === 'année') return currentDate.getFullYear();
    if (viewMode === 'mois') return currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const sw = getStartOfWeek(currentDate), ew = new Date(sw); ew.setDate(ew.getDate() + 6);
    return `${sw.getDate()} - ${ew.getDate()} ${ew.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  };
  const getPeriodTitle = () => {
    if (viewMode === 'année') return `de l'année ${currentDate.getFullYear()}`;
    if (viewMode === 'mois') return `du mois de ${currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    const sw = getStartOfWeek(currentDate), ew = new Date(sw); ew.setDate(ew.getDate() + 6);
    return `de la semaine du ${sw.getDate()} au ${ew.getDate()} ${ew.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  };

  // ── Rendu vues ──────────────────────────────────────────────────────────────
  const renderYearView = () => {
    const y = currentDate.getFullYear();
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {Array.from({ length: 12 }, (_, month) => {
          const md = new Date(y, month, 1);
          const count = filterBySC(filterByUser(astreintes)).filter(a => { const d = new Date(a.Date * 1000); return d.getFullYear() === y && d.getMonth() === month; }).length;
          return (
            <div key={month} onClick={() => { setCurrentDate(md); setViewMode('mois'); }} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', textTransform: 'capitalize' }}>{md.toLocaleDateString('fr-FR', { month: 'long' })}</h3>
              <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: 'bold' }}>{count}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>astreinte{count > 1 ? 's' : ''}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const y = currentDate.getFullYear(), mo = currentDate.getMonth();
    const firstDay = new Date(y, mo, 1);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
    const cur = new Date(start);
    const dayHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const cells = [];
    for (let w = 0; w < 6; w++) for (let d = 0; d < 7; d++) {
      const day = new Date(cur);
      const inMonth = day.getMonth() === mo;
      const isToday = day.toDateString() === new Date().toDateString();
      const dayA = filterBySC(getAstreintesForDate(day));
      cells.push(
        <div key={`${w}-${d}`} onClick={() => inMonth && (setCurrentDate(day), setViewMode('semaine'))} style={{ minHeight: '100px', padding: '8px', border: '1px solid #e5e7eb', background: inMonth ? 'white' : '#f9fafb', cursor: inMonth ? 'pointer' : 'default', opacity: inMonth ? 1 : 0.5 }}>
          <div style={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#3b82f6' : inMonth ? '#1f2937' : '#9ca3af', marginBottom: '4px', fontSize: '14px' }}>{day.getDate()}</div>
          <div style={{ fontSize: '10px' }}>
            {dayA.slice(0, 3).map((a, i) => (
              <div key={i} style={{ background: isJour(a) ? '#dbeafe' : '#e0f2fe', border: `1px solid ${a.En_Suivi ? '#10b981' : '#3b82f6'}`, color: isJour(a) ? '#1e40af' : '#0c4a6e', padding: '2px 4px', borderRadius: '3px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isJour(a) ? '☀️' : '🌙'} {getServiceName(a.TypeAstreinte).substring(0, 20)}
              </div>
            ))}
            {dayA.length > 3 && <div style={{ color: '#6b7280', fontSize: '9px' }}>+{dayA.length - 3} autre{dayA.length > 4 ? 's' : ''}</div>}
          </div>
        </div>
      );
      cur.setDate(cur.getDate() + 1);
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {dayHeaders.map(h => <div key={h} style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', fontSize: '14px', color: '#374151', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>{h}</div>)}
        {cells}
      </div>
    );
  };

  const renderWeekView = () => {
    const sw = getStartOfWeek(currentDate);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: 7 }, (_, i) => {
          const day = new Date(sw); day.setDate(day.getDate() + i);
          const isToday = day.toDateString() === new Date().toDateString();
          const dayA = filterBySC(getAstreintesForDate(day))
            .sort((a, b) => getServiceName(a.TypeAstreinte).localeCompare(getServiceName(b.TypeAstreinte), 'fr') || (isJour(a) ? -1 : 1));
          return (
            <div key={i}>
              <div style={{ padding: '15px', background: '#f3f4f6', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: isToday ? 'bold' : '500', color: isToday ? '#3b82f6' : '#1f2937' }}>
                <div style={{ fontSize: '12px', marginBottom: '2px' }}>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                <div style={{ fontSize: '16px' }}>{day.getDate()}</div>
              </div>
              <div style={{ padding: '10px', minHeight: '300px', background: 'white' }}>
                <button onClick={() => handleDateClick(day)} disabled={!isResponsable()} style={{ width: '100%', padding: '6px', background: '#f3f4f6', border: '1px dashed #d1d5db', borderRadius: '4px', fontSize: '11px', color: '#6b7280', cursor: isResponsable() ? 'pointer' : 'default', marginBottom: '8px', opacity: isResponsable() ? 1 : 0.5 }}>
                  {isResponsable() ? '✏️ Gérer' : '👁️ Consulter'}
                </button>
                {dayA.map((a, idx) => (
                  <div key={idx} style={{ background: isJour(a) ? '#dbeafe' : '#e0f2fe', padding: '6px 8px', borderRadius: '6px', marginBottom: '6px', fontSize: '11px', position: 'relative', border: `2px solid ${a.En_Suivi ? '#10b981' : '#3b82f6'}`, opacity: a.En_Suivi ? 0.8 : 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '2px' }}>{isJour(a) ? '☀️' : '🌙'} {getServiceName(a.TypeAstreinte)}</div>
                    <div style={{ color: '#6b7280' }}>{getClinicienName(a.Clinicien)}</div>
                    {isResponsable() && (
                      <button onClick={() => { if (a.En_Suivi) { alert('Astreinte validée, suppression impossible'); return; } handleDeleteAstreinte(a); }} style={{ position: 'absolute', top: '4px', right: '4px', background: a.En_Suivi ? '#d1d5db' : '#fecaca', color: a.En_Suivi ? '#9ca3af' : '#ef4444', border: 'none', borderRadius: '3px', padding: '1px 4px', fontSize: '10px', cursor: a.En_Suivi ? 'not-allowed' : 'pointer' }}>
                        {a.En_Suivi ? '🔒' : '❌'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Rendu principal ─────────────────────────────────────────────────────────
  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><div style={{ fontSize: '48px', marginBottom: '20px' }}>📅</div><div>Chargement...</div></div>;

  const viewAstr = getAstreintesView();

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white', padding: '10px', borderRadius: '12px', textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 4px 0' }}>📅 Planning des astreintes</h1>
        <p style={{ fontSize: '1rem', margin: 0, opacity: 0.9 }}>Gestion prévisionnelle des astreintes par service</p>
      </div>

      {/* Barre de navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={navigatePrevious} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>←</button>
          <button onClick={goToToday} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Aujourd'hui</button>
          <button onClick={navigateNext} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>→</button>
          <h2 style={{ margin: '0 0 0 10px', color: '#1f2937', textTransform: 'capitalize', fontSize: '16px' }}>{getCurrentViewTitle()}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={selectedServiceClinique} onChange={e => setSelectedServiceClinique(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}>
            <option value="tous">Tous les services</option>
            {getServicesCliniquesNoms().map(sc => <option key={sc} value={sc}>{sc}</option>)}
          </select>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
            {['année', 'mois', 'semaine'].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ background: viewMode === mode ? '#3b82f6' : 'transparent', color: viewMode === mode ? 'white' : '#374151', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>{mode}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Copier/Coller semaine */}
      {viewMode === 'semaine' && isResponsable() && (
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleCopyWeek} style={{ background: '#06b6d4', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>📋 Copier cette semaine</button>
          <button onClick={handlePasteWeek} disabled={!copiedWeek?.data?.length} style={{ background: copiedWeek?.data?.length ? '#10b981' : '#d1d5db', color: copiedWeek?.data?.length ? 'white' : '#9ca3af', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: copiedWeek?.data?.length ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '600' }}>📑 Coller</button>
          {copiedWeek?.data?.length > 0 && (
            <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
              ✓ {copiedWeek.data.length} astreinte{copiedWeek.data.length > 1 ? 's' : ''} copiée{copiedWeek.data.length > 1 ? 's' : ''} (sem. {copiedWeek.startDate.getDate()}-{copiedWeek.endDate.getDate()})
            </span>
          )}
        </div>
      )}

      {/* Vue calendrier */}
      <div style={{ marginBottom: '20px' }}>
        {viewMode === 'année' && renderYearView()}
        {viewMode === 'mois' && renderMonthView()}
        {viewMode === 'semaine' && renderWeekView()}
      </div>

      {/* Modal ajout/modification */}
      {showAddModal && selectedDate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '12px', minWidth: '480px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 18px 0', color: '#1f2937' }}>
              {isResponsable() ? (formData.jour || formData.nuit ? 'Modifier' : 'Nouvelle') + ' astreinte' : 'Consultation'} — {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>Service *</label>
              <select value={formData.service} onChange={e => handleServiceChange(e.target.value)} disabled={!isResponsable()} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: !isResponsable() ? '#f9fafb' : 'white' }}>
                <option value="">Sélectionner un service</option>
                {getServicesAutorises().map(s => <option key={s.id} value={s.id}>{s.TypeAstreinte}</option>)}
              </select>
            </div>

            {formData.service && getDisabledJourMsg(selectedDate, formData.service) && (
              <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ {getDisabledJourMsg(selectedDate, formData.service)}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Jour */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.jour} onChange={e => setFormData({ ...formData, jour: e.target.checked })} disabled={!isResponsable() || formData.jourValidated || shouldDisableJour(selectedDate, formData.service)} style={{ marginRight: '8px' }} />
                  <span style={{ fontWeight: '500', color: (formData.jourValidated || shouldDisableJour(selectedDate, formData.service)) ? '#9ca3af' : 'inherit' }}>☀️ Astreinte de jour</span>
                </label>
                {formData.jour && (
                  <select value={formData.clinicienJour} onChange={e => setFormData({ ...formData, clinicienJour: e.target.value })} disabled={!isResponsable() || formData.jourValidated} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}>
                    <option value="">Sélectionner</option>
                    {getCliniciensByService(formData.service).map(c => <option key={c.id} value={c.id}>{c.Clinicien}</option>)}
                  </select>
                )}
                {formData.jourValidated && <div style={{ marginTop: '4px', padding: '6px', background: '#d1fae5', borderRadius: '4px', fontSize: '12px', color: '#059669' }}>🔒 Non modifiable</div>}
              </div>
              {/* Nuit */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.nuit} onChange={e => setFormData({ ...formData, nuit: e.target.checked })} disabled={!isResponsable() || formData.nuitValidated} style={{ marginRight: '8px' }} />
                  <span style={{ fontWeight: '500', color: formData.nuitValidated ? '#9ca3af' : 'inherit' }}>🌙 Astreinte de nuit</span>
                </label>
                {formData.nuit && (
                  <select value={formData.clinicienNuit} onChange={e => setFormData({ ...formData, clinicienNuit: e.target.value })} disabled={!isResponsable() || formData.nuitValidated} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}>
                    <option value="">Sélectionner</option>
                    {getCliniciensByService(formData.service).map(c => <option key={c.id} value={c.id}>{c.Clinicien}</option>)}
                  </select>
                )}
                {formData.nuitValidated && <div style={{ marginTop: '4px', padding: '6px', background: '#d1fae5', borderRadius: '4px', fontSize: '12px', color: '#059669' }}>🔒 Non modifiable</div>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddModal(false); setFormData({ service: '', clinicienJour: '', clinicienNuit: '', date: '', jour: false, nuit: false, jourValidated: false, nuitValidated: false }); }} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer' }}>{isResponsable() ? 'Annuler' : 'Fermer'}</button>
              {isResponsable() && <button onClick={handleSaveAstreinte} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Sauvegarder</button>}
            </div>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}><h3 style={{ color: '#1f2937', margin: '0 0 10px 0' }}>Statistiques {getPeriodTitle()}</h3></div>
        {[
          { label: 'Total astreintes', value: viewAstr.length, color: '#3b82f6' },
          { label: 'Astreintes de jour', value: viewAstr.filter(a => isJour(a)).length, color: '#10b981' },
          { label: 'Astreintes de nuit', value: viewAstr.filter(a => isNuit(a)).length, color: '#8b5cf6' },
          { label: 'Services concernés', value: new Set(viewAstr.map(a => a.TypeAstreinte)).size, color: '#f59e0b' }
        ].map(s => (
          <div key={s.label} style={{ background: 'white', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', color: s.color, fontWeight: 'bold', marginBottom: '4px' }}>{s.value}</div>
            <div style={{ color: '#6b7280', fontSize: '13px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
