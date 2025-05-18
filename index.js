require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const AUTHORIZED_ROLE = process.env.AUTHORIZED_ROLE;
const THUMBNAIL_URL = process.env.THUMBNAIL_URL;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !AUTHORIZED_ROLE || !GUILD_ID) {
  console.error("⚠️ Veuillez vérifier que DISCORD_TOKEN, AUTHORIZED_ROLE et GUILD_ID sont bien définis dans .env");
  process.exit(1);
}

// Création du client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

// Définition de la commande slash
const commands = [
  new SlashCommandBuilder()
    .setName('annonce')
    .setDescription('Faire une annonce NorthSide Illégal')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Le message à annoncer')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription("Le salon où poster l'annonce")
        .setRequired(true))
    .addStringOption(option =>
      option.setName('title')
        .setDescription("Titre de l'annonce (optionnel)")
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription("URL d'une image à afficher dans l'embed (optionnel)")
        .setRequired(false))
].map(cmd => cmd.toJSON());

// Déploiement de la commande sur le serveur (guild only)
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Déploiement des commandes slash sur le serveur...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID || 'bot-id-not-ready-yet', GUILD_ID),
      { body: commands },
    );
    console.log('✅ Commandes déployées avec succès');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag} (ID: ${client.user.id})`);

  // Redéploiement commandes (pour cas où client.user n'était pas prêt avant)
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands },
    );
    console.log('✅ Commandes déployées (ready)');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'annonce') {
    // Vérifier rôle
    const member = interaction.member;
    if (!member.roles.cache.some(role => role.name === AUTHORIZED_ROLE)) {
      await interaction.reply({ content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
      return;
    }

    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title') || '📢 Annonce NorthSide Illégal';
    const image = interaction.options.getString('image');

    // Vérifier que le channel est un TextChannel
    if (!channel.isTextBased()) {
      await interaction.reply({ content: '❌ Veuillez choisir un salon texte valide.', ephemeral: true });
      return;
    }

    // Créer l'embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor(0xFF0000)
      .setFooter({ text: `Annonce faite par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    if (THUMBNAIL_URL) embed.setThumbnail(THUMBNAIL_URL);
    if (image) embed.setImage(image);

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Annonce envoyée dans ${channel.toString()} !`, ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `❌ Je n'ai pas pu envoyer le message : ${error.message}`, ephemeral: true });
    }
  }
});

client.login(TOKEN);