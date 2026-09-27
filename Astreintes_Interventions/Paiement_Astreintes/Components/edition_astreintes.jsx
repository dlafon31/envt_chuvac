const Component = () => {
  const [etats, setEtats] = useState([]);
  const [astreintesPayees, setAstreintesPayees] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEtat, setSelectedEtat] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const itemsPerPage = 10;

  useEffect(() => { loadData(); initializeDefaultDate(); }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedEtat(null);
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [etatsData, astreintesPayeesData, utilisateursData] = await Promise.all([
        gristAPI.getData('Astreintes_Etats'),
        gristAPI.getData('Astreintes_Payees'),
        gristAPI.getData('Utilisateurs')
      ]);
      setEtats(Array.isArray(etatsData) ? etatsData : []);
      setAstreintesPayees(Array.isArray(astreintesPayeesData) ? astreintesPayeesData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setEtats([]); setAstreintesPayees([]); setUtilisateurs([]);
    } finally { setLoading(false); }
  };

  const initializeDefaultDate = () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentDate(currentMonth);
    setSelectedYear(currentMonth.getFullYear().toString());
    setSelectedMonth(String(currentMonth.getMonth() + 1).padStart(2, '0'));
  };

  const navigatePrevious = () => {
    const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d);
    setSelectedYear(d.getFullYear().toString());
    setSelectedMonth(String(d.getMonth() + 1).padStart(2, '0'));
  };
  const navigateNext = () => {
    const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d);
    setSelectedYear(d.getFullYear().toString());
    setSelectedMonth(String(d.getMonth() + 1).padStart(2, '0'));
  };
  const goToToday = () => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentDate(d);
    setSelectedYear(d.getFullYear().toString());
    setSelectedMonth(String(d.getMonth() + 1).padStart(2, '0'));
  };

  const getMonthName = (monthNumber) => {
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return months[parseInt(monthNumber) - 1] || '';
  };

  const getFilteredEtats = () => {
    if (!selectedMonth || !selectedYear) return etats;
    const periodFilter = `${selectedYear}-${selectedMonth}`;
    return etats.filter(etat => etat.Periode === periodFilter);
  };

  const isGestionnaire = () => utilisateurs.length > 0 && utilisateurs[0].Gestionnaire === true;

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR');
  };
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleString('fr-FR');
  };

  // Génération du document HTML pour impression
  // etat peut contenir une Date_Edition surchargée localement (avant rechargement Grist)
  const generateEtatForPrint = (etat) => {
    const astreintesEtat = astreintesPayees.filter(ap => ap.Ref_Etat === etat.Ref);

    const groupedData = {};
    astreintesEtat.forEach(a => {
      const key = a.PrenomNom + '-' + a.Statut + '-' + a.Service;
      if (!groupedData[key]) groupedData[key] = { prenomNom: a.PrenomNom, statut: a.Statut, service: a.Service, count: 0, montantTotal: 0 };
      groupedData[key].count++;
      groupedData[key].montantTotal += a.Montant || 0;
    });

    const groupedArray = Object.values(groupedData);
    const totalMontant = groupedArray.reduce((sum, item) => sum + item.montantTotal, 0);
    const totalCount = groupedArray.reduce((sum, item) => sum + item.count, 0);

    // Nom du fichier toujours recalculé localement — ne jamais utiliser etat.Nom_Fichier
    // car il contient la valeur Grist d'avant la mise à jour (avec '?' si première édition)
    const dateEditionStr = etat.Date_Edition
      ? new Date(etat.Date_Edition * 1000).toISOString().slice(0, 10).replace(/-/g, '')
      : '?';
    const nomFichier = `Astreintes_${etat.Periode || '?'}_${etat.Support || '?'}_v${dateEditionStr}`;

    let htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${nomFichier}</title>
  <style>
    @media print {
      @page { size: A4; margin: 15mm; }
      body { margin: 0; font-size: 11px; color: #000; }
      .print-button, .instructions { display: none !important; }
      .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; page-break-inside: avoid; }
      .header-table td { padding: 3mm; vertical-align: middle; }
      .logo { max-height: 12mm; max-width: 35mm; object-fit: contain; }
      .title { text-align: center; font-size: 16px; font-weight: bold; padding: 5mm 0; border-bottom: 2px solid #000; margin-bottom: 5mm; page-break-after: avoid; }
      .content-table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
      .content-table th, .content-table td { border: 1px solid #000; padding: 2mm; text-align: left; font-size: 10px; }
      .content-table th { background-color: #f0f0f0 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .number { text-align: right; }
      .total-row { font-weight: bold !important; background-color: #e0e0e0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .footer-table { width: 100%; border-collapse: collapse; margin-top: 8mm; page-break-inside: avoid; }
      .footer-table td { padding: 2mm; vertical-align: top; font-size: 9px; }
      .signature-section { border: 1px solid #000; height: 15mm; text-align: center; padding: 2mm; }
      .content-table tr { page-break-inside: avoid; }
      h1, h2, h3 { page-break-after: avoid; }
    }
    @media screen {
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; }
      .container { max-width: 800px; margin: 0 auto; }
      .print-button { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; margin-bottom: 20px; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.2s ease; }
      .instructions { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
      .instructions p { margin: 0; color: #0369a1; line-height: 1.6; }
      .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; }
      .header-table td { padding: 15px; vertical-align: middle; border: 1px solid #e5e7eb; }
      .logo { max-height: 60px; max-width: 150px; }
      .title { text-align: center; font-size: 22px; font-weight: bold; padding: 20px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border-radius: 8px; margin-bottom: 25px; }
      .content-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
      .content-table th, .content-table td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
      .content-table th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
      .content-table tr:nth-child(even) { background-color: #f9fafb; }
      .total-row { background-color: #fef3c7 !important; font-weight: bold; }
      .footer-table { width: 100%; border-collapse: collapse; margin-top: 25px; border: 1px solid #e5e7eb; }
      .footer-table td { padding: 15px; vertical-align: top; border: 1px solid #e5e7eb; }
      .signature-section { background-color: #f9fafb; text-align: center; border: 2px dashed #d1d5db; min-height: 60px; display: flex; align-items: center; justify-content: center; color: #6b7280; }
    }
  </style>
</head>
<body>
  <div style="display:flex; gap:15px; align-items:flex-start; justify-content:space-between; margin-bottom:20px;">
    <button class="print-button" onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
    <button class="print-button" onclick="window.close()" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);">❌ Fermer</button>
  </div>
  <div class="instructions">
    <p>💡 Utilisez <strong>Ctrl+P</strong> (Windows) / <strong>Cmd+P</strong> (Mac), puis sélectionnez <strong>"Enregistrer au format PDF"</strong>.</p>
  </div>
  <table class="header-table">
    <tr>
      <td style="width:33%;"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Logo.ENVT.2018.png/330px-Logo.ENVT.2018.png" alt="Logo ENVT" class="logo"></td>
      <td style="width:34%;"></td>
      <td style="width:33%; text-align:right;"><img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Logo_ministere.png" alt="Logo Ministere" class="logo"></td>
    </tr>
  </table>
  <div class="title">Astreintes — ${etat.Nom}</div>
  <table class="content-table">
    <thead>
      <tr>
        <th>Nom et Prénom</th><th>Statut</th><th>Service</th>
        <th class="number">Nb astreintes</th><th class="number">Montant total</th>
      </tr>
    </thead>
    <tbody>`;

    groupedArray.forEach(item => {
      htmlContent += `
      <tr>
        <td>${item.prenomNom}</td><td>${item.statut}</td><td>${item.service}</td>
        <td class="number">${item.count}</td>
        <td class="number">${item.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
      </tr>`;
    });

    htmlContent += `
      <tr class="total-row">
        <td colspan="3">TOTAL</td>
        <td class="number">${totalCount}</td>
        <td class="number">${totalMontant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
      </tr>
    </tbody>
  </table>
  <table class="footer-table">
    <tr>
      <td style="width:40%;">
        <strong>Gestionnaire :</strong> ${etat.Gestionnaire}<br>
        <strong>Édité le :</strong> ${formatDateTime(etat.Date_Edition)}
        ${etat.Commentaire ? `<br><strong>Commentaire :</strong> ${etat.Commentaire}` : ''}
      </td>
      <td style="width:20%;"></td>
      <td style="width:40%;" class="signature-section"><strong>Signature Direction</strong></td>
    </tr>
  </table>
</body>
</html>`;

    return htmlContent;
  };

  const openPrintPage = (etat) => {
    const htmlContent = generateEtatForPrint(etat);
    const w = 900, h = 700;
    const l = (screen.width / 2) - (w / 2);
    const t = (screen.height / 2) - (h / 2);
    const newWindow = window.open('', '_blank', `width=${w},height=${h},top=${t},left=${l}`);
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    setTimeout(() => { newWindow.focus(); newWindow.print(); }, 1500);
  };

  const handleEditerEtat = async () => {
    if (!selectedEtat) { alert('Veuillez sélectionner un état de paiement'); return; }
    setProcessing(true);
    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Mettre à jour la date d'édition dans Grist
      await gristAPI.updateRecord('Astreintes_Etats', selectedEtat.id, {
        Date_Edition: currentTimestamp
      });

      // Ouvrir la page d'impression avec la date d'édition courante injectée localement.
      // On ne peut pas attendre le rechargement depuis Grist car l'objet selectedEtat
      // conserve encore l'ancienne valeur (null lors de la première édition),
      // ce qui produirait un '?' dans le nom du fichier généré.
      openPrintPage({ ...selectedEtat, Date_Edition: currentTimestamp });

      setSelectedEtat(null);
      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert("Erreur lors de l'édition: " + error.message);
    } finally { setProcessing(false); }
  };

  const filteredEtats = getFilteredEtats();
  const totalPages = Math.ceil(filteredEtats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEtats = filteredEtats.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => { setCurrentPage(page); setSelectedEtat(null); };
  const handleSelectEtat = (etat) => { setSelectedEtat(selectedEtat?.id === etat.id ? null : etat); };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
      <div>Chargement de l'édition des paiements...</div>
    </div>
  );

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', padding: '2px', borderRadius: '12px', textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>📄 Edition du paiement</h1>
        <p style={{ fontSize: '1rem', opacity: '0.9', margin: '0' }}>Générer les états de paiement des astreintes</p>
      </div>

      {!isGestionnaire() && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
          <div style={{ color: '#92400e', fontSize: '16px', fontWeight: '600' }}>Seuls les gestionnaires peuvent éditer les états de paiement</div>
        </div>
      )}

      {isGestionnaire() && (
        <>
          {/* Navigation mois */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 20px 2fr', background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <div><h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>📅 Sélection du mois</h2></div>
            <div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <button onClick={navigatePrevious} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>←</button>
              <button onClick={goToToday} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Aujourd'hui</button>
              <button onClick={navigateNext} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>→</button>
              <h3 style={{ margin: '0 0 0 15px', color: '#1f2937', textTransform: 'capitalize', fontSize: '18px' }}>{getMonthName(selectedMonth)} {selectedYear}</h3>
            </div>
          </div>

          {/* Tableau des états */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ background: '#f8fafc', padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0', color: '#1f2937', fontSize: '20px' }}>📄 États de paiement des astreintes</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', width: '50px' }}>Sél.</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Nom</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Date création</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Support</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Gestionnaire</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Date édition</th>
                    <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Nb astreintes</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEtats.map((etat, index) => (
                    <tr key={etat.id} onClick={() => handleSelectEtat(etat)} style={{ background: selectedEtat?.id === etat.id ? '#f0f9ff' : (index % 2 === 0 ? 'white' : '#f8fafc'), borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <td style={{ padding: '15px 20px' }}>
                        <input type="radio" checked={selectedEtat?.id === etat.id} onChange={() => handleSelectEtat(etat)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '15px 20px', fontWeight: selectedEtat?.id === etat.id ? '600' : 'normal' }}>{etat.Nom}</td>
                      <td style={{ padding: '15px 20px', color: '#64748b' }}>{formatDate(etat.Date_EtatPaiement)}</td>
                      <td style={{ padding: '15px 20px', color: '#64748b' }}>{etat.Support}</td>
                      <td style={{ padding: '15px 20px', color: '#374151' }}>{etat.Gestionnaire}</td>
                      <td style={{ padding: '15px 20px', color: '#64748b' }}>
                        {etat.Date_Edition ? (
                          <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>{formatDate(etat.Date_Edition)}</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Non édité</span>
                        )}
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '500' }}>{etat.Nbr_Astreintes || 0}</td>
                      <td style={{ padding: '15px 20px', color: '#374151' }}>{etat.Commentaire}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: currentPage === 1 ? '#f9fafb' : 'white', color: currentPage === 1 ? '#9ca3af' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>← Précédent</button>
                <span style={{ color: '#374151' }}>Page {currentPage} sur {totalPages}</span>
                <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: currentPage === totalPages ? '#f9fafb' : 'white', color: currentPage === totalPages ? '#9ca3af' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Suivant →</button>
              </div>
            )}
          </div>

          {/* Bouton édition */}
          <div style={{ background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', marginBottom: '20px' }}>
            <button onClick={handleEditerEtat} disabled={!selectedEtat || processing} style={{ background: (!selectedEtat || processing) ? '#d1d5db' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: (!selectedEtat || processing) ? '#9ca3af' : 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: (!selectedEtat || processing) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '280px', justifyContent: 'center' }}>
              {processing ? <><span>⏳</span><span>Édition en cours...</span></> : <><span>🖨️</span><span>Éditer pour impression</span></>}
            </button>
            {!selectedEtat && <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>Sélectionnez un état de paiement pour l'éditer</div>}
            {selectedEtat && <div style={{ marginTop: '6px', background: '#f0f9ff', borderRadius: '6px', padding: '6px', fontSize: '13px', color: '#0369a1' }}>📌 La page s'ouvrira dans un nouvel onglet. Utilisez <strong>Ctrl+P</strong> puis <strong>"Enregistrer au format PDF"</strong>.</div>}
          </div>
        </>
      )}

      {/* Statistiques */}
      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        {[
          { value: filteredEtats.length, label: 'Total états', color: '#8b5cf6' },
          { value: filteredEtats.filter(e => e.Date_Edition).length, label: 'États édités', color: '#10b981' },
          { value: filteredEtats.filter(e => !e.Date_Edition).length, label: 'États non édités', color: '#f59e0b' }
        ].map(s => (
          <div key={s.label} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: s.color, fontWeight: 'bold', marginBottom: '4px' }}>{s.value}</div>
            <div style={{ color: '#6b7280', fontSize: '13px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};