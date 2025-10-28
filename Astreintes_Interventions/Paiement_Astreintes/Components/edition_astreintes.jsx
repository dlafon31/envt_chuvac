const Component = () => {
  const [etats, setEtats] = useState([]);
  const [astreintesPayees, setAstreintesPayees] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEtat, setSelectedEtat] = useState(null); // MODIFICATION : sélection unique
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(''); // AJOUT : filtre par mois
  const [selectedYear, setSelectedYear] = useState(''); // AJOUT : filtre par année
  const [currentDate, setCurrentDate] = useState(new Date());
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
    initializeDefaultDate(); // AJOUT : initialiser la date par défaut
  }, []);

  // AJOUT : Effect pour filtrer quand la période change
  useEffect(() => {
    setCurrentPage(1); // Revenir à la première page lors du changement de filtre
    setSelectedEtat(null); // Désélectionner lors du changement de filtre
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
      setEtats([]);
      setAstreintesPayees([]);
      setUtilisateurs([]);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultDate = () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentDate(currentMonth); // AJOUT : définir currentDate
    setSelectedYear(currentMonth.getFullYear().toString());
    setSelectedMonth(String(currentMonth.getMonth() + 1).padStart(2, '0'));
  };
  
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setSelectedYear(newDate.getFullYear().toString());
    setSelectedMonth(String(newDate.getMonth() + 1).padStart(2, '0'));
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    setSelectedYear(newDate.getFullYear().toString());
    setSelectedMonth(String(newDate.getMonth() + 1).padStart(2, '0'));
  };

  const goToToday = () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentDate(currentMonth);
    setSelectedYear(currentMonth.getFullYear().toString());
    setSelectedMonth(String(currentMonth.getMonth() + 1).padStart(2, '0'));
  };

  // AJOUT : Fonction pour obtenir le nom du mois
  const getMonthName = (monthNumber) => {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return months[parseInt(monthNumber) - 1] || '';
  };

  // AJOUT : Fonction pour filtrer les états selon la période
  const getFilteredEtats = () => {
    if (!selectedMonth || !selectedYear) {
      return etats;
    }
    
    const periodFilter = `${selectedYear}-${selectedMonth}`;
    return etats.filter(etat => etat.Periode === periodFilter);
  };

  const isGestionnaire = () => {
    if (!utilisateurs || utilisateurs.length === 0) return false;
    const premierUtilisateur = utilisateurs[0];
    return premierUtilisateur.Gestionnaire === true;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleString('fr-FR');
  };

  // Génération HTML optimisée pour l'impression
  const generateEtatForPrint = (etat) => {
    const astreintesEtat = astreintesPayees.filter(ap => ap.Ref_Etat === etat.Ref);
    
    const groupedData = {};
    astreintesEtat.forEach(astreinte => {
      const key = astreinte.PrenomNom + '-' + astreinte.Statut + '-' + astreinte.Service;
      if (!groupedData[key]) {
        groupedData[key] = {
          prenomNom: astreinte.PrenomNom,
          statut: astreinte.Statut,
          service: astreinte.Service,
          count: 0,
          montantTotal: 0
        };
      }
      groupedData[key].count++;
      groupedData[key].montantTotal += astreinte.Montant || 0;
    });

    const groupedArray = Object.values(groupedData);
    const totalMontant = groupedArray.reduce((sum, item) => sum + item.montantTotal, 0);
    const totalCount = groupedArray.reduce((sum, item) => sum + item.count, 0);

    let htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${etat.Nom_Fichier || etat.Nom}</title>
  <style>
    /* Styles pour l'impression/PDF */
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
      
      body {
        margin: 0;
        font-size: 11px;
        color: #000;
      }
      
      .print-button {
        display: none !important;
      }
      
      .instructions {
        display: none !important;
      }
      
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8mm;
        page-break-inside: avoid;
      }
      
      .header-table td {
        padding: 3mm;
        vertical-align: middle;
      }
      
      .logo {
        max-height: 12mm;
        max-width: 35mm;
        object-fit: contain;
      }
      
      .title {
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        padding: 5mm 0;
        border-bottom: 2px solid #000;
        margin-bottom: 5mm;
        page-break-after: avoid;
      }
      
      .content-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 5mm;
      }
      
      .content-table th,
      .content-table td {
        border: 1px solid #000;
        padding: 2mm;
        text-align: left;
        font-size: 10px;
      }
      
      .content-table th {
        background-color: #f0f0f0 !important;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .number {
        text-align: right;
      }
      
      .total-row {
        font-weight: bold !important;
        background-color: #e0e0e0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .footer-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8mm;
        page-break-inside: avoid;
      }
      
      .footer-table td {
        padding: 2mm;
        vertical-align: top;
        font-size: 9px;
      }
      
      .signature-section {
        border: 1px solid #000;
        height: 15mm;
        text-align: center;
        padding: 2mm;
      }
      
      /* Éviter les coupures de page */
      .content-table tr {
        page-break-inside: avoid;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
    }
    
    /* Styles pour l'écran */
    @media screen {
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        margin: 20px;
        font-size: 12px;
        line-height: 1.4;
      }
      
      .container {
        max-width: 800px;
        margin: 0 auto;
      }
      
      .print-button {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 30px;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
      }
      
      .print-button:hover {
        background: linear-gradient(135deg, #7c3aed 0%, #6b21a8 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
      }
      
      .instructions {
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 30px;
      }
      
      .instructions h3 {
        margin: 0 0 10px 0;
        color: #0c4a6e;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .instructions p {
        margin: 0;
        color: #0369a1;
        line-height: 1.6;
      }
      
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border: 1px solid #e5e7eb;
      }
      
      .header-table td {
        padding: 15px;
        vertical-align: middle;
        border: 1px solid #e5e7eb;
      }
      
      .logo {
        max-height: 60px;
        max-width: 150px;
      }
      
      .title {
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        padding: 25px 0;
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        color: white;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      
      .content-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .content-table th,
      .content-table td {
        border: 1px solid #d1d5db;
        padding: 12px;
        text-align: left;
      }
      
      .content-table th {
        background-color: #f3f4f6;
        font-weight: bold;
        color: #374151;
      }
      
      .content-table tr:nth-child(even) {
        background-color: #f9fafb;
      }
      
      .total-row {
        background-color: #fef3c7 !important;
        font-weight: bold;
      }
      
      .footer-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 30px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .footer-table td {
        padding: 20px;
        vertical-align: top;
        border: 1px solid #e5e7eb;
      }
      
      .signature-section {
        background-color: #f9fafb;
        text-align: center;
        border: 2px dashed #d1d5db;
        min-height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
      }
    }
  </style>
</head>
<body>
	<div style="display: flex; gap: 15px; align-items: flex-start; justify-content: space-between; margin-bottom: 30px;">
	  <button class="print-button" onclick="window.print()" style="
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		color: white;
		border: none;
		padding: 15px 30px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 16px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
		height: 54px;
		flex-shrink: 0;
	  " onmouseover="this.style.background='linear-gradient(135deg, #7c3aed 0%, #6b21a8 100%)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(0, 0, 0, 0.15)';" onmouseout="this.style.background='linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)';">
		🖨️ Imprimer / Sauvegarder en PDF
	  </button>
	  
	  <button class="print-button" onclick="window.close()" style="
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		color: white;
		border: none;
		padding: 15px 30px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 16px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
		height: 54px;
		flex-shrink: 0;
	  " onmouseover="this.style.background='linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(0, 0, 0, 0.15)';" onmouseout="this.style.background='linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)';">
		❌ Fermer la pop-up
	  </button>
	</div>
    
    <div class="instructions">
      <h3>💡 Instructions</h3>
      <p>
        Cliquez sur le bouton ci-dessus ou utilisez <strong>Ctrl+P</strong> (Windows) / <strong>Cmd+P</strong> (Mac), 
        puis sélectionnez <strong>"Enregistrer au format PDF"</strong> comme destination d'impression.
      </p>
    </div>
    
    <table class="header-table">
      <tr>
        <td style="width: 33%;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Logo.ENVT.2018.png/330px-Logo.ENVT.2018.png" alt="Logo ENVT" class="logo">
        </td>
        <td style="width: 34%;"></td>
        <td style="width: 33%; text-align: right;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Minist%C3%A8re_de_l%E2%80%99Agriculture_et_de_la_Souverainet%C3%A9_alimentaire.svg/640px-Minist%C3%A8re_de_l%E2%80%99Agriculture_et_de_la_Souverainet%C3%A9_alimentaire.svg.png" alt="Logo Ministere" class="logo">
        </td>
      </tr>
    </table>
    
    <div class="title">Astreintes - ${etat.Nom}</div>
    
    <table class="content-table">
      <thead>
        <tr>
          <th>Nom et Prénom</th>
          <th>Statut</th>
          <th>Service</th>
          <th>Nombre d'astreintes</th>
          <th>Montant total</th>
        </tr>
      </thead>
      <tbody>`;

    groupedArray.forEach(item => {
      htmlContent += `
        <tr>
          <td>${item.prenomNom}</td>
          <td>${item.statut}</td>
          <td>${item.service}</td>
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
        <td style="width: 40%;">
          <strong>Gestionnaire :</strong> ${etat.Gestionnaire}<br>
          <strong>Édité le :</strong> ${formatDateTime(etat.Date_Edition || Math.floor(Date.now() / 1000))}
          ${etat.Commentaire ? `<br><strong>Commentaire :</strong> ${etat.Commentaire}` : ''}
        </td>
        <td style="width: 20%;"></td>
        <td style="width: 40%;" class="signature-section">
          <strong>Signature Direction</strong>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

    return htmlContent;
  };

  // Ouvrir page d'impression
  const openPrintPage = (etat) => {
    const htmlContent = generateEtatForPrint(etat);
	const w = 900;
	const h = 700;
	const l = (screen.width/2)-(w/2);
	const t = (screen.height/2)-(h/2);
    const newWindow = window.open('', '_blank', 'width='+w+',height='+h+',top='+t+', left='+l);
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    // Déclencher l'impression après un délai pour permettre le chargement des images
    setTimeout(() => {
      newWindow.focus();
      newWindow.print();
    }, 1500);
  };

  // MODIFICATION : Gestion de l'édition pour sélection unique
  const handleEditerEtat = async () => {
    if (!selectedEtat) {
      alert('Veuillez sélectionner un état de paiement');
      return;
    }

    // const message = `Confirmer l'édition de l'état de paiement "${selectedEtat.Nom}" ?`;
    
    // if (!confirm(message)) {
    //   return;
    // }

    setProcessing(true);

    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      // Mettre à jour la date d'édition
      await gristAPI.updateRecord('Astreintes_Etats', selectedEtat.id, {
        Date_Edition: currentTimestamp
      });

      // Ouvrir la page d'impression
      openPrintPage(selectedEtat);

      setSelectedEtat(null);
      await loadData();

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'édition: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // MODIFICATION : Utiliser les états filtrés
  const filteredEtats = getFilteredEtats();
  const totalPages = Math.ceil(filteredEtats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEtats = filteredEtats.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedEtat(null); // MODIFICATION : désélectionner lors du changement de page
  };

  // MODIFICATION : Gestion de la sélection unique
  const handleSelectEtat = (etat) => {
    setSelectedEtat(selectedEtat?.id === etat.id ? null : etat);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
        <div>Chargement de l'édition des paiements...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: 'white',
        padding: '2px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '10px'
      }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '2px' 
        }}>
          📄 Edition du paiement
        </h1>
        <p style={{ fontSize: '1rem', opacity: '0.9', margin: '0' }}>
          Générer les états de paiement des astreintes
        </p>
      </div>

      {!isGestionnaire() && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
          <div style={{ color: '#92400e', fontSize: '16px', fontWeight: '600' }}>
            Seuls les responsables peuvent éditer les états de paiement
          </div>
        </div>
      )}

      {isGestionnaire() && (
        <>
          {/* AJOUT : Sélection du mois et de l'année */}
          <div style={{
		    display: 'grid',
		    gridTemplateColumns: 'auto 20px 2fr',
            background: 'white',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
			<div>
              <h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>
                📅 Sélection du mois
              </h2>
			</div>
			<div></div>
		    <div style={{
			  display: 'flex',
			  justifyContent: 'space-between',
			  alignItems: 'center',
			  marginBottom: '15px',
			  flexWrap: 'wrap',
			  gap: '15px'
		    }}>
			  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
			    <button 
				  onClick={navigatePrevious} 
				  style={{
				    background: '#6b7280',
				    color: 'white',
				    border: 'none',
				    padding: '8px 12px',
				    borderRadius: '6px',
				    cursor: 'pointer'
				  }}
			    >
				  ←
			    </button>
			  
			    <button 
				  onClick={goToToday} 
				  style={{
				    background: '#10b981',
				    color: 'white',
				    border: 'none',
				    padding: '8px 16px',
				    borderRadius: '6px',
				    cursor: 'pointer'
				  }}
			    >
				  Aujourd'hui
			    </button>
			  
			    <button 
				  onClick={navigateNext} 
				  style={{
				    background: '#6b7280',
				    color: 'white',
				    border: 'none',
				    padding: '8px 12px',
				    borderRadius: '6px',
				    cursor: 'pointer'
				  }}
			    >
				  →
			    </button>
			  
			    <h3 style={{ 
				  margin: '0 0 0 15px', 
				  color: '#1f2937', 
				  textTransform: 'capitalize',
				  fontSize: '18px'
			    }}>
				  {getMonthName(selectedMonth)} {selectedYear}
			    </h3>
			  </div>
		    </div>
          </div>

          {/* Tableau des états */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            marginBottom: '10px'
          }}>
            <div style={{
              background: '#f8fafc',
              padding: '10px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ margin: '0', color: '#1f2937', fontSize: '20px' }}>
                📄 États de paiement des astreintes 
              </h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {/* MODIFICATION : Suppression de la colonne "Sélectionner tout" */}
                    <th style={{
                      padding: '15px 20px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#475569',
                      borderBottom: '2px solid #e2e8f0',
                      width: '50px'
                    }}>
                      Sélection
                    </th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Nom</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Date création</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Support</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Gestionnaire</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Date édition</th>
                    <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Nbr d'astreintes</th>
					<th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEtats.map((etat, index) => (
                    <tr key={etat.id} style={{
                      background: selectedEtat?.id === etat.id ? '#f0f9ff' : (index % 2 === 0 ? 'white' : '#f8fafc'),
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer' // AJOUT : curseur pointer pour toute la ligne
                    }}
                    onClick={() => handleSelectEtat(etat)} // AJOUT : sélection en cliquant sur la ligne
                    >
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                        {/* MODIFICATION : Radio button au lieu de checkbox */}
                        <input
                          type="radio"
                          checked={selectedEtat?.id === etat.id}
                          onChange={() => handleSelectEtat(etat)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ 
                        padding: '15px 20px', 
                        borderBottom: '1px solid #e2e8f0',
                        fontWeight: selectedEtat?.id === etat.id ? '600' : 'normal'
                      }}>
                        {etat.Nom}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        {formatDate(etat.Date_EtatPaiement)}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        {etat.Support}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', color: '#374151' }}>
                        {etat.Gestionnaire}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        {etat.Date_Edition ? (
                          <span style={{
                            background: '#d1fae5',
                            color: '#059669',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {formatDate(etat.Date_Edition)}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                            Non édité
                          </span>
                        )}
                      </td>
                      <td style={{
                        padding: '15px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#374151',
                        textAlign: 'center',
                        fontWeight: '500'
                      }}>
                        {etat.Nbr_Astreintes || 0}
                      </td>
                      <td style={{
                        padding: '15px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#374151',
                        textAlign: 'center',
                        fontWeight: '500'
                      }}>
                        {etat.Commentaire}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{
                padding: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }}>
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f9fafb' : 'white',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← Précédent
                </button>

                <span style={{ margin: '0 15px', color: '#374151' }}>
                  Page {currentPage} sur {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f9fafb' : 'white',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>

          {/* Bouton d'édition */}
          <div style={{
            background: 'white',
            padding: '2px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <button
              onClick={handleEditerEtat}
              disabled={!selectedEtat || processing}
              style={{
                background: (!selectedEtat || processing) 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: (!selectedEtat || processing) 
                  ? '#9ca3af' 
                  : 'white',
                border: 'none',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (!selectedEtat || processing) 
                  ? 'not-allowed' 
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                minWidth: '280px',
                margin: '0 auto',
                transition: 'all 0.2s ease'
              }}
            >
              {processing ? (
                <>
                  <span>⏳</span>
                  <span>Édition en cours...</span>
                </>
              ) : (
                <>
                  <span>🖨️</span>
                  <span>
                    Éditer pour impression
                  </span>
                </>
              )}
            </button>
            
            {!selectedEtat && (
              <div style={{
                marginTop: '4px',
                color: '#6b7280',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                Sélectionnez un état de paiement pour l'éditer
              </div>
            )}
            
            {selectedEtat && (
              <div style={{
                marginTop: '4px',
                // padding: '2px',
                background: '#f0f9ff',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#0369a1'
              }}>
                📌 La page s'ouvrira dans un nouvel onglet. Utilisez <strong>Ctrl+P</strong> puis <strong>"Enregistrer au format PDF"</strong>.
              </div>
            )}
          </div>
        </>
      )}

      {/* Statistiques - MODIFICATION : utiliser les états filtrés */}
      <div style={{
        marginTop: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '2px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '2px' }}>
            {filteredEtats.length}
          </div>
          <div style={{ color: '#6b7280' }}>Total états</div>
        </div>

        <div style={{
          background: 'white',
          padding: '2px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', color: '#10b981', fontWeight: 'bold', marginBottom: '2px' }}>
            {filteredEtats.filter(e => e.Date_Edition).length}
          </div>
          <div style={{ color: '#6b7280' }}>États édités</div>
        </div>

        <div style={{
          background: 'white',
          padding: '2px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '2px' }}>
            {filteredEtats.filter(e => !e.Date_Edition).length}
          </div>
          <div style={{ color: '#6b7280' }}>États non édités</div>
        </div>
      </div>

      {/* Guide d'utilisation */}
      <div style={{
        marginTop: '30px',
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          color: '#1f2937', 
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          💡 Guide d'utilisation
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '20px',
            background: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #0ea5e9'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '15px', textAlign: 'center' }}>🖨️</div>
            <h4 style={{ margin: '0 0 10px 0', color: '#0c4a6e', textAlign: 'center' }}>Impression PDF</h4>
            <div style={{ fontSize: '14px', color: '#0369a1', lineHeight: '1.6' }}>
              • Filtrez par mois/année si nécessaire<br />
              • Sélectionnez l'état à éditer<br />
              • Cliquez sur "Éditer pour impression"<br />
              • La page s'ouvrira automatiquement<br />
              • Utilisez <strong>Ctrl+P</strong> ou <strong>Cmd+P</strong><br />
              • Sélectionnez "Enregistrer au format PDF"
            </div>
          </div>
          
          <div style={{
            padding: '20px',
            background: '#f3e8ff',
            borderRadius: '8px',
            border: '1px solid #8b5cf6'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '15px', textAlign: 'center' }}>🗂️</div>
            <h4 style={{ margin: '0 0 10px 0', color: '#6b21a8', textAlign: 'center' }}>Filtre par période</h4>
            <div style={{ fontSize: '14px', color: '#7c3aed', lineHeight: '1.6' }}>
              • Sélectionnez un mois et une année<br />
              • Les états seront filtrés automatiquement<br />
              • Par défaut : mois précédent<br />
              • Laissez vide pour voir tous les états<br />
              • Le compteur se met à jour en temps réel
            </div>
          </div>
          
          <div style={{
            padding: '20px',
            background: '#ecfdf5',
            borderRadius: '8px',
            border: '1px solid #10b981'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '15px', textAlign: 'center' }}>🔒</div>
            <h4 style={{ margin: '0 0 10px 0', color: '#047857', textAlign: 'center' }}>Sélection unique</h4>
            <div style={{ fontSize: '14px', color: '#059669', lineHeight: '1.6' }}>
              • Un seul état sélectionnable à la fois<br />
              • Cliquez sur la ligne pour sélectionner<br />
              • Recliquez pour désélectionner<br />
              • Édition instantanée une fois sélectionné<br />
              • Date d'édition automatique
            </div>
          </div>
        </div>
        
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#fef3c7',
          borderRadius: '6px',
          border: '1px solid #f59e0b'
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#92400e', 
            lineHeight: '1.6',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div>
              <strong>Important :</strong> Autorisez les fenêtres pop-up dans votre navigateur pour permettre l'ouverture automatique de la page d'impression. Si la page ne s'ouvre pas, vérifiez les paramètres de votre bloqueur de pop-up.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};