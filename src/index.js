const { response } = require("express");
const express = require("express");

const app = express();

app.use(express.json());

app.get("/boleto/:valor", (request, response) => {
  const { valor } = request.params;

  var temponto = valor.indexOf('.');
  if (temponto > -1) {
    return response.status(400).json({ error: "Informe somente números" });
  }



  //Calculo para extrair valor a ser pago da linha digitavel do boleto
  function valorBoleto(barCode) {
    const linhaDig = barCode;
    var valor_final;

    const v = parseFloat(linhaDig.substring(linhaDig.length - 10, linhaDig.length)).toString();

    if (v.length == 2) {
      valor_final = "0," + v;
    } else if (v.length == 1) {
      valor_final = "0,0" + v;
    } else {
      var valor_final = v.substring(0, v.length - 2) + "," + v.substring(v.length - 2, v.length);
    }

    return valor_final;
  }

  //Calculo para extrair a data de vencimento da linha digitavel do boleto
  function dataVenc(barCode) {
    const linhaDig = barCode;
    const venc = linhaDig.slice(33, 37);

    var date = new Date('10/07/1997');
    date.setTime(date.getTime() + (venc * 24 * 60 * 60 * 1000));

    const data = date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + ("0" + (date.getDate())).slice(-2);

    return data;
  }

  //Jogando resultado das funções em variaveis para poderem ser mostrados no retorno da aplicação
  var val = valorBoleto(valor);
  var dtvenci = dataVenc(valor);

  //Pegando trecho que pertence aao campo1 de toda a linha digitavel
  const campo1 = valor.substring(0, 10);
  //Pegando digito verificador do campo1 
  const campo1DV = campo1.substring(9);
  //Pegando trecho que pertence aao campo1 de toda a linha digitavel,
  //sem o digito verificador
  const campo1SemDV = campo1.substring(0, 9);

  //Pegando trecho que pertence aao campo2 de toda a linha digitavel
  const campo2 = valor.substring(10, 21);
  //Pegando digito verificador do campo2 
  const campo2DV = campo2.substring(10);
  //Pegando trecho que pertence aao campo2 de toda a linha digitavel,
  //sem o digito verificador
  const campo2SemDV = campo2.substring(0, 10);

  //Pegando trecho que pertence aao campo3 de toda a linha digitavel
  const campo3 = valor.substring(21, 32);
  //Pegando digito verificador do campo3
  const campo3DV = campo3.substring(10);
  //Pegando trecho que pertence aao campo3 de toda a linha digitavel,
  //sem o digito verificador
  const campo3SemDV = campo3.substring(0, 10);

  //Array com os primeiros 3 campos da linha digitável, sem seus digitos verificadores
  const campos = [campo1SemDV, campo2SemDV, campo3SemDV];
  //Array com os digitos verificadores dos campos da linha digitavel
  const arrayDVs = [campo1DV, campo2DV, campo3DV];

  //Percorrendo cada elemento do array de campos, que obviamente contém cada 
  //campo da linha digitavel
  const c = campos.map(campo => {
    //Invertendo todos os campos para fazer multiplicações da direita para esquerda
    const campoInvertido = campo.split('').reverse();

    //Iniciando multiplicador com 1
    let mult = 1;

    //Percorrendo cada numero de cada campo da linha digitavel
    //para multiplicar cada numero alternando entre 2 e 1 o multiplicador
    const array = campoInvertido.map((item) => {

      if (mult == 1) {
        mult++

        //Multiplicando os numeros dos campos por 2, os que precisam ser multiplicados por 2
        result = item * mult;

        //Se o resultado da multiplicação por 2 for maior que nove, então o numero resultado
        //será separado e somado um algararis com outro para obter outro resultado
        if (result > 9) {
          let v = result.toString().split('');

          let v1 = parseInt(v[0]);
          let v2 = parseInt(v[1]);
          let valores = v1 + v2;
          result = valores;

        }

      } else {
        mult--

        //Multiplicando os numeros dos campos por 1, os que precisam ser multiplicados por 1
        result = item * mult;

      }

      return result;

    });


    //Soma de todos os elementos do campo após as multiplicações 
    const total = array.reduce((accumulator, itemArray) => accumulator + itemArray);

    //Obtendo o resto da divisão do total da soma dos elementos do campo
    //por 10
    const resto = total % 10;

    //Obtendo a dezena mais próxima do valor do resto da divisão da operação anterior
    const dezenaProxima = Math.ceil(resto / 10.0) * 10;

    //Obtendo o digito verificador do campo
    const dv = dezenaProxima - resto;

    //Desinvertendo o campo após fazer todos calculos e obter o digito verificador
    const naoInverso = array.reverse();

    //Adicionando o digito verificador no camp
    naoInverso.push(dv);

    return naoInverso;

  });

  //Juntando os primeiros campos da linha digitavel 
  const arrayConcatenados = Array.prototype.concat(c[0], c[1], c[2]);

  //Validando cada digito verificador de cada campo para ver se o informado na linha digitavel
  //bate com o digito verificador obtido pelos calculos
  if (arrayDVs[0] == arrayConcatenados[9] &&
    arrayDVs[1] == arrayConcatenados[20] &&
    arrayDVs[2] == arrayConcatenados[31]) {
    //Se batem, então será retornado a linha digitada, o valor e a data de expiração do boleto e status 200
    return response.status(200).json({ barCode: valor, amount: val, expirationDate: dtvenci });
  } else {
    //Se não batem, então será retornado status 400
    return response.status(400);
  }

});

app.listen(3333, () => {
  console.log("Server running on port 3333!");
});